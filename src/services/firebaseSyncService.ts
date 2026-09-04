// Real-Time Firebase Synchronization Service for SUPER X SMS
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, set, get, remove, onValue } from "firebase/database";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { firestoreDb, realtimeDb, firebaseConfig, firebaseAuth } from "./firebaseConfig";
import {
  UserAccount,
  SubAdminAccount,
  getAllAccounts,
  saveAllAccounts,
  getAllSubAdmins,
  saveAllSubAdmins,
  syncSubAdminToUserAccount,
  getDeletedAccountEmails,
  getDedicatedAccountCode,
} from "./userAuthService";
import {
  ChatMessage,
  getAllSupportMessages,
  CHAT_UPDATE_EVENT,
} from "./supportChatService";
import {
  NotificationItem,
  getAllNotifications,
  saveAllNotifications,
  NOTIFICATION_UPDATE_EVENT,
} from "./notificationService";
import {
  TopAppItem,
  getTopAppsConfig,
  saveTopAppsConfig,
  TOP_APPS_UPDATE_EVENT,
} from "./topAppsService";

let isInitialized = false;
let isSyncingFromRemote = false;
let isEnsuringAuth = false;

// Authenticate client-side Firebase session so Firestore security rules allow read/write
export async function ensureFirebaseAuth(): Promise<boolean> {
  if (!firebaseAuth) return false;
  if (firebaseAuth.currentUser) return true;
  if (isEnsuringAuth) {
    await new Promise((r) => setTimeout(r, 400));
    return !!firebaseAuth.currentUser;
  }
  isEnsuringAuth = true;
  try {
    await signInWithEmailAndPassword(
      firebaseAuth,
      "system_sync@superxsms.com",
      "SuperXSyncSecretPassword2026!"
    );
    return true;
  } catch (err: any) {
    console.warn("Firebase Auth sign in note:", err?.message);
    return false;
  } finally {
    isEnsuringAuth = false;
  }
}

// 1. Sync User Accounts with Firestore & Realtime DB ('users', 'super_x_accounts', 'pending_accounts', 'accounts')
export async function fetchAccountsFromFirebaseDirectly(): Promise<UserAccount[]> {
  try {
    await ensureFirebaseAuth();
    const deletedSet = getDeletedAccountEmails();
    const accountsCol = firestoreDb ? collection(firestoreDb, "super_x_accounts") : null;
    const usersCol = firestoreDb ? collection(firestoreDb, "users") : null;
    const pendingCol = firestoreDb ? collection(firestoreDb, "pending_accounts") : null;
    const rtdbAccountsRef = realtimeDb ? ref(realtimeDb, "accounts") : null;

    const [accountsSnap, usersSnap, pendingSnap, rtdbSnap] = await Promise.all([
      accountsCol ? getDocs(accountsCol).catch(() => null) : Promise.resolve(null),
      usersCol ? getDocs(usersCol).catch(() => null) : Promise.resolve(null),
      pendingCol ? getDocs(pendingCol).catch(() => null) : Promise.resolve(null),
      rtdbAccountsRef ? get(rtdbAccountsRef).catch(() => null) : Promise.resolve(null),
    ]);

    const remoteAccounts: UserAccount[] = [];

    if (accountsSnap && !accountsSnap.empty) {
      accountsSnap.docs.forEach((d) => {
        const data = d.data() as UserAccount;
        if (data && (data.email || (data as any).id)) {
          remoteAccounts.push(data);
        }
      });
    }

    if (usersSnap && !usersSnap.empty) {
      usersSnap.docs.forEach((d) => {
        const data = d.data() as UserAccount;
        if (data && (data.email || (data as any).id)) {
          remoteAccounts.push(data);
        }
      });
    }

    if (pendingSnap && !pendingSnap.empty) {
      pendingSnap.docs.forEach((d) => {
        const data = d.data() as UserAccount;
        if (data && (data.email || (data as any).id)) {
          remoteAccounts.push(data);
        }
      });
    }

    if (rtdbSnap && rtdbSnap.exists()) {
      const val = rtdbSnap.val();
      if (val && typeof val === "object") {
        Object.values(val).forEach((d: any) => {
          if (d && (d.email || d.id)) {
            remoteAccounts.push(d as UserAccount);
          }
        });
      }
    }

    if (remoteAccounts.length > 0) {
      isSyncingFromRemote = true;
      const localAccounts = getAllAccounts();
      const accountMap = new Map<string, UserAccount>();

      localAccounts.forEach((a) => {
        const clean = (a.email || "").toLowerCase().trim();
        if (clean && !deletedSet.has(clean) && !deletedSet.has((a.id || "").toLowerCase())) {
          accountMap.set(clean, a);
        }
      });

      remoteAccounts.forEach((remote) => {
        if (remote && remote.email) {
          const clean = remote.email.toLowerCase().trim();
          const remoteId = (remote.id || "").toLowerCase().trim();

          if (clean && !deletedSet.has(clean) && !deletedSet.has(remoteId)) {
            const local = accountMap.get(clean);
            if (!local) {
              accountMap.set(clean, remote);
            } else {
              const localTime = local.updatedAt || local.approvedAt || local.rejectedAt || local.createdAt || 0;
              const remoteTime = remote.updatedAt || remote.approvedAt || remote.rejectedAt || remote.createdAt || 0;

              if (remoteTime >= localTime) {
                accountMap.set(clean, { ...local, ...remote });
              }
            }
          }
        }
      });

      const merged = Array.from(accountMap.values());
      saveAllAccounts(merged);
      isSyncingFromRemote = false;
      return merged;
    }
  } catch (err) {
    console.warn("fetchAccountsFromFirebaseDirectly error:", err);
  }
  return getAllAccounts();
}

// Target lookup for specific user across Firestore docs, queries, RTDB, and Firebase Auth
export async function fetchSpecificUserFromFirebase(
  identifier: string,
  password?: string
): Promise<UserAccount | null> {
  const clean = (identifier || "").trim().toLowerCase();
  if (!clean) return null;

  ensureFirebaseAuth().catch(() => null);

  const deletedSet = getDeletedAccountEmails();
  if (deletedSet.has(clean)) return null;

  const safeDocId = clean.replace(/[^a-zA-Z0-9_-]/g, "_");
  const candidates = [safeDocId];

  if (!clean.includes("@")) {
    candidates.push(`${clean}@gmail.com`.replace(/[^a-zA-Z0-9_-]/g, "_"));
  }

  let foundAccount: UserAccount | null = null;

  // 1. Direct parallel document lookups across Firestore
  if (firestoreDb) {
    try {
      const collectionsToTry = ["super_x_accounts", "users", "pending_accounts"];
      const docPromises: Promise<any>[] = [];

      for (const docId of candidates) {
        for (const colName of collectionsToTry) {
          docPromises.push(getDoc(doc(firestoreDb, colName, docId)).catch(() => null));
        }
      }

      // Also add collection queries in parallel
      for (const colName of collectionsToTry) {
        const colRef = collection(firestoreDb, colName);
        docPromises.push(getDocs(query(colRef, where("email", "==", clean))).catch(() => null));
        if (!clean.includes("@")) {
          docPromises.push(getDocs(query(colRef, where("username", "==", clean))).catch(() => null));
        }
      }

      const results = await Promise.allSettled(docPromises);
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          const val = res.value;
          if (typeof val.exists === 'function' && val.exists()) {
            const data = val.data() as UserAccount;
            if (data && (data.email || (data as any).id)) {
              foundAccount = data;
              break;
            }
          } else if (val.docs && Array.isArray(val.docs) && val.docs.length > 0) {
            const data = val.docs[0].data() as UserAccount;
            if (data && (data.email || (data as any).id)) {
              foundAccount = data;
              break;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Direct Realtime DB lookup if not yet found
  if (!foundAccount && realtimeDb) {
    try {
      const rtdbPromises = candidates.map((docId) =>
        get(ref(realtimeDb, `accounts/${docId}`)).catch(() => null)
      );
      const rtdbResults = await Promise.allSettled(rtdbPromises);
      for (const res of rtdbResults) {
        if (res.status === 'fulfilled' && res.value && res.value.exists()) {
          const data = res.value.val() as UserAccount;
          if (data && (data.email || (data as any).id)) {
            foundAccount = data;
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Try Firebase Auth sign in if password provided
  if (!foundAccount && password && clean.includes("@")) {
    try {
      const cleanPass = password.trim();
      const authPassword = cleanPass.length < 6 ? cleanPass + "123456" : cleanPass;

      let secondaryApp;
      const secondaryAppName = "SecondaryUserTestApp";
      const existingApps = getApps();
      const foundApp = existingApps.find((a) => a.name === secondaryAppName);
      if (foundApp) {
        secondaryApp = foundApp;
      } else {
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      }
      const secondaryAuth = getAuth(secondaryApp);

      let userCred = await signInWithEmailAndPassword(secondaryAuth, clean, authPassword).catch(() => null);
      if (!userCred && cleanPass !== authPassword) {
        userCred = await signInWithEmailAndPassword(secondaryAuth, clean, cleanPass).catch(() => null);
      }

      if (userCred && userCred.user && userCred.user.email) {
        const authEmail = userCred.user.email.toLowerCase();
        foundAccount = {
          id: `user_${authEmail.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
          name: authEmail.split("@")[0],
          email: authEmail,
          username: authEmail.split("@")[0],
          password: cleanPass,
          accountCode: getDedicatedAccountCode(authEmail),
          status: "approved",
          role: "user",
          createdAt: Date.now(),
          approvedAt: Date.now(),
          note: "Authenticated via Firebase Auth",
        };
      }
    } catch {
      // ignore
    }
  }

  if (foundAccount) {
    const currentAccounts = getAllAccounts();
    const existingIndex = currentAccounts.findIndex(
      (a) => a.email.toLowerCase() === foundAccount!.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      currentAccounts[existingIndex] = { ...currentAccounts[existingIndex], ...foundAccount };
    } else {
      currentAccounts.unshift(foundAccount);
    }
    saveAllAccounts(currentAccounts);
    saveAccountToFirebase(foundAccount, true);
    return foundAccount;
  }

  return null;
}

// Target lookup for Sub-Admin in Firestore 'super_x_sub_admins'
export async function fetchSpecificSubAdminFromFirebase(
  identifier: string
): Promise<SubAdminAccount | null> {
  const clean = (identifier || "").trim().toLowerCase();
  if (!clean) return null;
  ensureFirebaseAuth().catch(() => null);
  if (!firestoreDb) return null;

  try {
    const safeDocId = clean.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docSnap = await getDoc(doc(firestoreDb, "super_x_sub_admins", safeDocId)).catch(() => null);
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data() as SubAdminAccount;
      if (data && data.email) return data;
    }

    const subCol = collection(firestoreDb, "super_x_sub_admins");
    const q = query(subCol, where("email", "==", clean));
    const snap = await getDocs(q).catch(() => null);
    if (snap && !snap.empty) {
      return snap.docs[0].data() as SubAdminAccount;
    }
  } catch (err) {
    console.warn("fetchSpecificSubAdminFromFirebase note:", err);
  }
  return null;
}

export function initAccountsRealtimeSync() {
  if (!firestoreDb) return;
  try {
    // Immediate eager fetch on startup
    fetchAccountsFromFirebaseDirectly();

    const usersCol = collection(firestoreDb, "users");
    const accountsCol = collection(firestoreDb, "super_x_accounts");
    const pendingCol = collection(firestoreDb, "pending_accounts");

    const processSnapshot = (snapshot: any, sourceName: string) => {
      const deletedSet = getDeletedAccountEmails();
      const remoteAccounts: UserAccount[] = [];

      if (!snapshot.empty) {
        snapshot.docs.forEach((docSnap: any) => {
          const data = docSnap.data() as UserAccount;
          if (data && (data.email || (data as any).id)) {
            const emailClean = (data.email || "").toLowerCase().trim();
            const idClean = ((data as any).id || "").toLowerCase().trim();

            if (deletedSet.has(emailClean) || deletedSet.has(idClean)) {
              if (emailClean) deleteAccountFromFirebase(emailClean);
              if (idClean) deleteAccountFromFirebase(idClean);
            } else {
              remoteAccounts.push(data);
            }
          }
        });
      }

      isSyncingFromRemote = true;
      const localAccounts = getAllAccounts();
      const accountMap = new Map<string, UserAccount>();

      localAccounts.forEach((a) => {
        const clean = (a.email || "").toLowerCase().trim();
        if (clean && !deletedSet.has(clean) && !deletedSet.has((a.id || "").toLowerCase())) {
          accountMap.set(clean, a);
        }
      });

      remoteAccounts.forEach((remote) => {
        if (remote && remote.email) {
          const clean = remote.email.toLowerCase().trim();
          const remoteId = (remote.id || "").toLowerCase().trim();

          if (clean && !deletedSet.has(clean) && !deletedSet.has(remoteId)) {
            const local = accountMap.get(clean);
            if (!local) {
              accountMap.set(clean, remote);
            } else {
              const localTime = local.updatedAt || local.approvedAt || local.rejectedAt || local.createdAt || 0;
              const remoteTime = remote.updatedAt || remote.approvedAt || remote.rejectedAt || remote.createdAt || 0;

              if (remoteTime > localTime) {
                accountMap.set(clean, remote);
              } else if (localTime > remoteTime) {
                saveAccountToFirebase(local, true);
              } else {
                accountMap.set(clean, { ...local, ...remote });
              }
            }
          }
        }
      });

      const merged = Array.from(accountMap.values());
      saveAllAccounts(merged);
      isSyncingFromRemote = false;
    };

    onSnapshot(
      usersCol,
      (snapshot) => {
        processSnapshot(snapshot, "users");
      },
      (error) => {
        console.warn("Firestore 'users' real-time listener note:", error.message);
      }
    );

    onSnapshot(
      accountsCol,
      (snapshot) => {
        processSnapshot(snapshot, "super_x_accounts");
      },
      (error) => {
        console.warn("Firestore 'super_x_accounts' real-time listener note:", error.message);
      }
    );

    onSnapshot(
      pendingCol,
      (snapshot) => {
        processSnapshot(snapshot, "pending_accounts");
      },
      (error) => {
        console.warn("Firestore 'pending_accounts' real-time listener note:", error.message);
      }
    );

    // Also attach Realtime DB listener for instant accounts sync
    try {
      const rtdbRef = ref(realtimeDb, "accounts");
      onValue(rtdbRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val && typeof val === "object") {
            const remoteList: UserAccount[] = (Object.values(val).filter((d: any) => d && (d.email || d.id)) as UserAccount[]);
            if (remoteList.length > 0 && !isSyncingFromRemote) {
              isSyncingFromRemote = true;
              const deletedSet = getDeletedAccountEmails();
              const localAccounts = getAllAccounts();
              const accountMap = new Map<string, UserAccount>();

              localAccounts.forEach((a) => {
                const clean = (a.email || "").toLowerCase().trim();
                if (clean && !deletedSet.has(clean) && !deletedSet.has((a.id || "").toLowerCase())) {
                  accountMap.set(clean, a);
                }
              });

              remoteList.forEach((remote) => {
                if (remote && remote.email) {
                  const clean = remote.email.toLowerCase().trim();
                  if (clean && !deletedSet.has(clean)) {
                    const local = accountMap.get(clean);
                    if (!local) {
                      accountMap.set(clean, remote);
                    } else {
                      const localTime = local.updatedAt || local.approvedAt || local.createdAt || 0;
                      const remoteTime = remote.updatedAt || remote.approvedAt || remote.createdAt || 0;
                      if (remoteTime >= localTime) {
                        accountMap.set(clean, { ...local, ...remote });
                      }
                    }
                  }
                }
              });

              saveAllAccounts(Array.from(accountMap.values()));
              isSyncingFromRemote = false;
            }
          }
        }
      });
    } catch (e) {
      console.warn("Realtime DB accounts listener note:", e);
    }
  } catch (err) {
    console.warn("Could not attach accounts Firestore listener:", err);
  }
}

// Register user account in Firebase Authentication using createUserWithEmailAndPassword
export async function registerUserInFirebaseAuth(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanPassword) {
      return { success: false, error: 'Valid email and password required' };
    }

    // Firebase Auth requires password >= 6 characters
    const authPassword = cleanPassword.length < 6 ? cleanPassword + "123456" : cleanPassword;

    // Use secondary app to ensure active Admin session on primary firebaseAuth is NOT logged out
    let secondaryApp;
    const secondaryAppName = "SecondaryUserAuthApp";
    const existingApps = getApps();
    const found = existingApps.find(a => a.name === secondaryAppName);
    if (found) {
      secondaryApp = found;
    } else {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    }
    const secondaryAuth = getAuth(secondaryApp);

    const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, authPassword);
    console.log(`[Firebase Auth] Registered ${cleanEmail} successfully via createUserWithEmailAndPassword! UID: ${userCred.user.uid}`);
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      console.log(`[Firebase Auth] User ${email} already exists in Firebase Authentication.`);
      return { success: true };
    }
    console.warn("[Firebase Auth] createUserWithEmailAndPassword note:", err?.code || err?.message);
    return { success: false, error: err?.message };
  }
}

// Push single account update to Firebase Firestore & Realtime DB
export async function saveAccountToFirebase(account: UserAccount, force = true) {
  if (isSyncingFromRemote && !force) return;
  try {
    await ensureFirebaseAuth();
    const safeDocId = account.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
    const accountRef = doc(firestoreDb, "super_x_accounts", safeDocId);
    const usersRef = doc(firestoreDb, "users", safeDocId);
    const pendingRef = doc(firestoreDb, "pending_accounts", safeDocId);
    const payload = { ...account, lastSyncedAt: Date.now(), updatedAt: account.updatedAt || Date.now() };

    const promises: Promise<any>[] = [
      setDoc(accountRef, payload, { merge: true }).catch(() => null),
      setDoc(usersRef, payload, { merge: true }).catch(() => null),
    ];

    if (realtimeDb) {
      const rtdbRef = ref(realtimeDb, `accounts/${safeDocId}`);
      promises.push(set(rtdbRef, payload).catch(() => null));
    }

    if (account.status === 'pending') {
      promises.push(setDoc(pendingRef, payload, { merge: true }).catch(() => null));
    } else {
      promises.push(deleteDoc(pendingRef).catch(() => null));
    }

    await Promise.all(promises);

    // Also register user in Firebase Authentication if password exists
    if (account.password && (account.status === 'approved' || account.status === 'pending')) {
      registerUserInFirebaseAuth(account.email, account.password).catch(() => null);
    }
  } catch (err) {
    console.warn("Firebase saveAccount error:", err);
  }
}

// Delete account from Firebase Firestore & Realtime DB
export async function deleteAccountFromFirebase(accountEmail: string) {
  try {
    const safeDocId = accountEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
    const accountRef = doc(firestoreDb, "super_x_accounts", safeDocId);
    const usersRef = doc(firestoreDb, "users", safeDocId);
    const pendingRef = doc(firestoreDb, "pending_accounts", safeDocId);

    const promises: Promise<any>[] = [
      deleteDoc(accountRef).catch(() => null),
      deleteDoc(usersRef).catch(() => null),
      deleteDoc(pendingRef).catch(() => null),
    ];

    if (realtimeDb) {
      const rtdbRef = ref(realtimeDb, `accounts/${safeDocId}`);
      promises.push(remove(rtdbRef).catch(() => null));
    }

    await Promise.all(promises);
  } catch (err) {
    console.warn("Firebase deleteAccount error:", err);
  }
}

// Purge all user accounts from Firebase Firestore & Realtime DB except Super Admin
export async function purgeRemoteFirebaseAccountsExceptSuperAdmin(): Promise<void> {
  const superAdminEmail = 'xzrmunna96@gmail.com';
  try {
    await ensureFirebaseAuth();
    if (!firestoreDb) return;

    const collectionsToClean = ['super_x_accounts', 'users', 'pending_accounts'];
    for (const colName of collectionsToClean) {
      const colRef = collection(firestoreDb, colName);
      const snap = await getDocs(colRef).catch(() => null);
      if (snap && !snap.empty) {
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const email = (data.email || docSnap.id || '').toLowerCase().trim();
          if (email && email !== superAdminEmail && !email.includes('xzrmunna96')) {
            await deleteDoc(docSnap.ref).catch(() => null);
          }
        }
      }
    }

    if (realtimeDb) {
      const rtdbSnap = await get(ref(realtimeDb, 'accounts')).catch(() => null);
      if (rtdbSnap && rtdbSnap.exists()) {
        const val = rtdbSnap.val();
        if (val && typeof val === 'object') {
          for (const [key, item] of Object.entries<any>(val)) {
            const email = (item?.email || key).toLowerCase().trim();
            if (email && email !== superAdminEmail && !email.includes('xzrmunna96')) {
              await remove(ref(realtimeDb, `accounts/${key}`)).catch(() => null);
            }
          }
        }
      }
    }
    console.log('[Firebase Client Sync] Purged remote user accounts except Super Admin.');
  } catch (err: any) {
    console.warn('purgeRemoteFirebaseAccountsExceptSuperAdmin error:', err?.message);
  }
}

// 2. Sync Support Chat Messages with Firestore Realtime Collection
export function initChatRealtimeSync() {
  if (!firestoreDb) return;
  try {
    const chatCol = collection(firestoreDb, "super_x_support_chats");

    onSnapshot(
      chatCol,
      (snapshot) => {
        if (snapshot.empty) {
          // If empty, sync local messages up
          const localMsgs = getAllSupportMessages();
          if (localMsgs.length > 0) {
            localMsgs.forEach((msg) => saveChatMessageToFirebase(msg));
          }
          return;
        }

        const remoteMsgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ChatMessage;
          if (data && data.id && data.text) {
            remoteMsgs.push(data);
          }
        });

        if (remoteMsgs.length > 0) {
          isSyncingFromRemote = true;
          const localMsgs = getAllSupportMessages();
          const msgMap = new Map<string, ChatMessage>();

          localMsgs.forEach((m) => msgMap.set(m.id, m));
          remoteMsgs.forEach((m) => msgMap.set(m.id, m));

          const merged = Array.from(msgMap.values()).sort((a, b) => a.timestamp - b.timestamp);
          
          try {
            localStorage.setItem("super_x_sms_support_chats", JSON.stringify(merged));
            localStorage.setItem("super_x_sms_support_chats_backup", JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT, { detail: { messages: merged } }));
          } catch {}
          isSyncingFromRemote = false;
        }
      },
      (error) => {
        console.warn("Firestore Chat real-time listener note:", error.message);
      }
    );
  } catch (err) {
    console.warn("Could not attach chat Firestore listener:", err);
  }
}

// Push chat message to Firebase Firestore
export async function saveChatMessageToFirebase(message: ChatMessage) {
  if (!firestoreDb) return;
  try {
    const msgRef = doc(firestoreDb, "super_x_support_chats", message.id);
    await setDoc(msgRef, message, { merge: true });
  } catch (err) {
    console.warn("Firebase saveChatMessage error (offline fallback active):", err);
  }
}

// 3. Sync Notifications with Firestore Realtime Collection
export function initNotificationsRealtimeSync() {
  if (!firestoreDb) return;
  try {
    const notifsCol = collection(firestoreDb, "super_x_notifications");

    onSnapshot(
      notifsCol,
      (snapshot) => {
        if (snapshot.empty) {
          const localNotifs = getAllNotifications();
          if (localNotifs.length > 0) {
            localNotifs.forEach((n) => saveNotificationToFirebase(n));
          }
          return;
        }

        const remoteNotifs: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as NotificationItem;
          if (data && data.id) {
            remoteNotifs.push(data);
          }
        });

        if (remoteNotifs.length > 0) {
          isSyncingFromRemote = true;
          const localNotifs = getAllNotifications();
          const notifMap = new Map<string, NotificationItem>();

          localNotifs.forEach((n) => notifMap.set(n.id, n));
          remoteNotifs.forEach((n) => notifMap.set(n.id, n));

          const merged = Array.from(notifMap.values()).sort((a, b) => b.timestamp - a.timestamp);
          saveAllNotifications(merged);
          isSyncingFromRemote = false;
        }
      },
      (error) => {
        console.warn("Firestore Notifications real-time listener note:", error.message);
      }
    );
  } catch (err) {
    console.warn("Could not attach notifications Firestore listener:", err);
  }
}

// Push notification to Firebase Firestore
export async function saveNotificationToFirebase(notif: NotificationItem) {
  if (!firestoreDb) return;
  try {
    const notifRef = doc(firestoreDb, "super_x_notifications", notif.id);
    await setDoc(notifRef, notif, { merge: true });
  } catch (err) {
    console.warn("Firebase saveNotification error (offline fallback active):", err);
  }
}

// Delete notification from Firebase Firestore
export async function deleteNotificationFromFirebase(notifId: string) {
  if (!firestoreDb) return;
  try {
    const notifRef = doc(firestoreDb, "super_x_notifications", notifId);
    await deleteDoc(notifRef);
  } catch (err) {
    console.warn("Firebase deleteNotification error:", err);
  }
}

// 4. Sync Sub-Admins with Firestore Realtime Collection
export function initSubAdminsRealtimeSync() {
  if (!firestoreDb) return;
  try {
    const subAdminsCol = collection(firestoreDb, "super_x_sub_admins");

    onSnapshot(
      subAdminsCol,
      (snapshot) => {
        if (snapshot.empty) {
          const localSubs = getAllSubAdmins();
          if (localSubs.length > 0) {
            localSubs.forEach((sub) => saveSubAdminToFirebase(sub));
          }
          return;
        }

        const remoteSubs: SubAdminAccount[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SubAdminAccount;
          if (data && data.id && data.email) {
            remoteSubs.push(data);
          }
        });

        if (remoteSubs.length > 0) {
          isSyncingFromRemote = true;
          const localSubs = getAllSubAdmins();
          const subMap = new Map<string, SubAdminAccount>();

          localSubs.forEach((s) => subMap.set(s.id, s));
          remoteSubs.forEach((s) => subMap.set(s.id, s));

          const merged = Array.from(subMap.values());
          saveAllSubAdmins(merged);
          // Sync all remote sub-admins to user accounts so they can log into the website as well
          merged.forEach((sub) => {
            syncSubAdminToUserAccount(sub);
          });
          isSyncingFromRemote = false;
        }
      },
      (error) => {
        console.warn("Firestore Sub-Admins real-time listener note:", error.message);
      }
    );
  } catch (err) {
    console.warn("Could not attach sub-admins Firestore listener:", err);
  }
}

// Push sub-admin to Firebase Firestore
export async function saveSubAdminToFirebase(sub: SubAdminAccount) {
  if (!firestoreDb) return;
  try {
    const subRef = doc(firestoreDb, "super_x_sub_admins", sub.id);
    await setDoc(subRef, sub, { merge: true });
  } catch (err) {
    console.warn("Firebase saveSubAdmin error (offline fallback active):", err);
  }
}

// Delete sub-admin from Firebase Firestore
export async function deleteSubAdminFromFirebase(subId: string) {
  if (!firestoreDb) return;
  try {
    const subRef = doc(firestoreDb, "super_x_sub_admins", subId);
    await deleteDoc(subRef);
  } catch (err) {
    console.warn("Firebase deleteSubAdmin error:", err);
  }
}

// 5. Sync Top Apps Configuration with Firestore
export function initTopAppsRealtimeSync() {
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, "super_x_system", "top_apps");

    onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.apps) && data.apps.length > 0) {
            isSyncingFromRemote = true;
            saveTopAppsConfig(data.apps);
            isSyncingFromRemote = false;
          }
        } else {
          // Upload initial defaults
          const localApps = getTopAppsConfig();
          saveTopAppsToFirebase(localApps);
        }
      },
      (error) => {
        console.warn("Firestore TopApps real-time listener note:", error.message);
      }
    );
  } catch (err) {
    console.warn("Could not attach top apps Firestore listener:", err);
  }
}

// Push top apps to Firebase
export async function saveTopAppsToFirebase(apps: TopAppItem[]) {
  if (!firestoreDb) return;
  try {
    const docRef = doc(firestoreDb, "super_x_system", "top_apps");
    await setDoc(docRef, { apps, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("Firebase saveTopApps error:", err);
  }
}

import { initApiConfigsRealtimeSync } from "./apiConfigService";

// Master Initializer: Boot all real-time synchronizers
export function initializeFirebaseSync() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  console.log("⚡ Starting SUPER X SMS Firebase Real-time Synchronization...");
  ensureFirebaseAuth().catch(() => null);
  initAccountsRealtimeSync();
  initChatRealtimeSync();
  initNotificationsRealtimeSync();
  initSubAdminsRealtimeSync();
  initTopAppsRealtimeSync();
  initApiConfigsRealtimeSync();
  console.log("✅ Firebase Real-time listeners active for Admin & User Panels.");
}

// Real-Time Firebase Synchronization Service for SUPER X SMS
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, set, get, remove, onValue } from "firebase/database";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firestoreDb, realtimeDb, firebaseConfig } from "./firebaseConfig";
import {
  UserAccount,
  SubAdminAccount,
  getAllAccounts,
  saveAllAccounts,
  getAllSubAdmins,
  saveAllSubAdmins,
  syncSubAdminToUserAccount,
  getDeletedAccountEmails,
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

// 1. Sync User Accounts with Firestore & Realtime DB ('users', 'super_x_accounts', 'accounts')
export async function fetchAccountsFromFirebaseDirectly(): Promise<UserAccount[]> {
  try {
    const deletedSet = getDeletedAccountEmails();
    const accountsCol = collection(firestoreDb, "super_x_accounts");
    const usersCol = collection(firestoreDb, "users");
    const rtdbAccountsRef = ref(realtimeDb, "accounts");

    const [accountsSnap, usersSnap, rtdbSnap] = await Promise.all([
      getDocs(accountsCol).catch(() => null),
      getDocs(usersCol).catch(() => null),
      get(rtdbAccountsRef).catch(() => null),
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

export function initAccountsRealtimeSync() {
  try {
    // Immediate eager fetch on startup
    fetchAccountsFromFirebaseDirectly();

    const usersCol = collection(firestoreDb, "users");
    const accountsCol = collection(firestoreDb, "super_x_accounts");

    const processSnapshot = (snapshot: any, sourceName: string) => {
      const deletedSet = getDeletedAccountEmails();
      if (snapshot.empty) {
        const localAccounts = getAllAccounts();
        if (localAccounts.length > 0) {
          localAccounts.forEach((acc) => {
            if (!deletedSet.has(acc.email.toLowerCase()) && !deletedSet.has(acc.id.toLowerCase())) {
              saveAccountToFirebase(acc, true);
            }
          });
        }
        return;
      }

      const remoteAccounts: UserAccount[] = [];
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
    const safeDocId = account.email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_");
    const accountRef = doc(firestoreDb, "super_x_accounts", safeDocId);
    const usersRef = doc(firestoreDb, "users", safeDocId);
    const rtdbRef = ref(realtimeDb, `accounts/${safeDocId}`);
    const payload = { ...account, lastSyncedAt: Date.now(), updatedAt: account.updatedAt || Date.now() };

    await Promise.all([
      setDoc(accountRef, payload, { merge: true }).catch(() => null),
      setDoc(usersRef, payload, { merge: true }).catch(() => null),
      set(rtdbRef, payload).catch(() => null),
    ]);

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
    const rtdbRef = ref(realtimeDb, `accounts/${safeDocId}`);

    await Promise.all([
      deleteDoc(accountRef).catch(() => null),
      deleteDoc(usersRef).catch(() => null),
      remove(rtdbRef).catch(() => null),
    ]);
  } catch (err) {
    console.warn("Firebase deleteAccount error:", err);
  }
}

// 2. Sync Support Chat Messages with Firestore Realtime Collection
export function initChatRealtimeSync() {
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
  try {
    const msgRef = doc(firestoreDb, "super_x_support_chats", message.id);
    await setDoc(msgRef, message, { merge: true });
  } catch (err) {
    console.warn("Firebase saveChatMessage error (offline fallback active):", err);
  }
}

// 3. Sync Notifications with Firestore Realtime Collection
export function initNotificationsRealtimeSync() {
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
  try {
    const notifRef = doc(firestoreDb, "super_x_notifications", notif.id);
    await setDoc(notifRef, notif, { merge: true });
  } catch (err) {
    console.warn("Firebase saveNotification error (offline fallback active):", err);
  }
}

// Delete notification from Firebase Firestore
export async function deleteNotificationFromFirebase(notifId: string) {
  try {
    const notifRef = doc(firestoreDb, "super_x_notifications", notifId);
    await deleteDoc(notifRef);
  } catch (err) {
    console.warn("Firebase deleteNotification error:", err);
  }
}

// 4. Sync Sub-Admins with Firestore Realtime Collection
export function initSubAdminsRealtimeSync() {
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
  try {
    const subRef = doc(firestoreDb, "super_x_sub_admins", sub.id);
    await setDoc(subRef, sub, { merge: true });
  } catch (err) {
    console.warn("Firebase saveSubAdmin error (offline fallback active):", err);
  }
}

// Delete sub-admin from Firebase Firestore
export async function deleteSubAdminFromFirebase(subId: string) {
  try {
    const subRef = doc(firestoreDb, "super_x_sub_admins", subId);
    await deleteDoc(subRef);
  } catch (err) {
    console.warn("Firebase deleteSubAdmin error:", err);
  }
}

// 5. Sync Top Apps Configuration with Firestore
export function initTopAppsRealtimeSync() {
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
  initAccountsRealtimeSync();
  initChatRealtimeSync();
  initNotificationsRealtimeSync();
  initSubAdminsRealtimeSync();
  initTopAppsRealtimeSync();
  initApiConfigsRealtimeSync();
  console.log("✅ Firebase Real-time listeners active for Admin & User Panels.");
}

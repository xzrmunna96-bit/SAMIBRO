import https from "https";

const API_KEY = "AIzaSyBhXcv4tNEO7vFmqfMlvZlndcUGtsWLIHs";
const PROJECT_ID = "super-x-sms";
const SYSTEM_EMAIL = "system_sync@superxsms.com";
const SYSTEM_PASSWORD = "SuperXSyncSecretPassword2026!";

function httpsRequest(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method,
          headers: headers || {},
        },
        (res) => {
          let d = "";
          res.on("data", (chunk) => (d += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 500, body: d }));
        }
      );
      req.on("error", (err) => {
        console.warn("[Firebase Admin Sync Request Error]", err.message);
        resolve({ status: 500, body: JSON.stringify({ error: err.message }) });
      });
      if (body) req.write(body);
      req.end();
    } catch (e: any) {
      resolve({ status: 500, body: JSON.stringify({ error: e?.message || "Unknown error" }) });
    }
  });
}

let cachedToken = "";
let tokenExpiry = 0;

export async function getFirebaseIdToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const postData = JSON.stringify({
    email: SYSTEM_EMAIL,
    password: SYSTEM_PASSWORD,
    returnSecureToken: true,
  });

  const res = await httpsRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    "POST",
    { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(postData)) },
    postData
  );

  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      cachedToken = data.idToken;
      tokenExpiry = Date.now() + 3500 * 1000;
      return cachedToken;
    } catch {
      // ignore
    }
  }

  // If sign in fails, attempt sign up
  const signupRes = await httpsRequest(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    "POST",
    { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(postData)) },
    postData
  );

  if (signupRes.status === 200) {
    try {
      const data = JSON.parse(signupRes.body);
      cachedToken = data.idToken;
      tokenExpiry = Date.now() + 3500 * 1000;
      return cachedToken;
    } catch {
      // ignore
    }
  }

  return "";
}

function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const obj: Record<string, any> = {};
  for (const [k, v] of Object.entries<any>(doc.fields)) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) obj[k] = new Date(v.timestampValue).getTime();
  }
  return obj;
}

function accountToFirestoreFields(acc: any): { fields: Record<string, any> } {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(acc)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "number") {
      if (Number.isInteger(v)) fields[k] = { integerValue: String(v) };
      else fields[k] = { doubleValue: v };
    } else if (typeof v === "boolean") {
      fields[k] = { booleanValue: v };
    }
  }
  return { fields };
}

export function toSafeDocId(emailOrId: string): string {
  return String(emailOrId || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function fetchRemoteAccountsFromFirestore(): Promise<any[]> {
  try {
    const token = await getFirebaseIdToken();
    if (!token) return [];

    const res = await httpsRequest(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/super_x_accounts?pageSize=300`,
      "GET",
      { Authorization: `Bearer ${token}` }
    );

    if (res.status === 200) {
      const data = JSON.parse(res.body);
      const docs = data.documents || [];
      return docs.map(parseFirestoreDoc).filter((d: any) => d && d.email);
    }
  } catch (err: any) {
    console.warn("[Firebase Admin Sync] fetchRemoteAccountsFromFirestore error:", err.message);
  }
  return [];
}

export async function fetchSingleAccountFromFirestore(emailOrId: string): Promise<any | null> {
  try {
    const token = await getFirebaseIdToken();
    if (!token) return null;

    const safeId = toSafeDocId(emailOrId);

    // Try super_x_accounts first
    const res1 = await httpsRequest(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/super_x_accounts/${safeId}`,
      "GET",
      { Authorization: `Bearer ${token}` }
    );
    if (res1.status === 200) {
      return parseFirestoreDoc(JSON.parse(res1.body));
    }

    // Try users collection
    const res2 = await httpsRequest(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${safeId}`,
      "GET",
      { Authorization: `Bearer ${token}` }
    );
    if (res2.status === 200) {
      return parseFirestoreDoc(JSON.parse(res2.body));
    }
  } catch (err: any) {
    console.warn("[Firebase Admin Sync] fetchSingleAccount error:", err.message);
  }
  return null;
}

export async function saveAccountToFirestore(account: any): Promise<boolean> {
  if (!account || !account.email) return false;
  try {
    const token = await getFirebaseIdToken();
    if (!token) return false;

    const safeId = toSafeDocId(account.email);
    const body = JSON.stringify(accountToFirestoreFields({
      ...account,
      updatedAt: account.updatedAt || Date.now(),
      lastSyncedAt: Date.now(),
    }));

    // Save to both collections: super_x_accounts and users
    const [r1, r2] = await Promise.all([
      httpsRequest(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/super_x_accounts/${safeId}`,
        "PATCH",
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
        },
        body
      ),
      httpsRequest(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${safeId}`,
        "PATCH",
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
        },
        body
      ),
    ]);

    // Also if password exists, register in Firebase Auth
    if (account.password) {
      registerInFirebaseAuth(account.email, account.password).catch(() => null);
    }

    return r1.status === 200 || r2.status === 200;
  } catch (err: any) {
    console.warn("[Firebase Admin Sync] saveAccountToFirestore error:", err.message);
    return false;
  }
}

export async function deleteAccountFromFirestore(emailOrId: string): Promise<boolean> {
  if (!emailOrId) return false;
  try {
    const token = await getFirebaseIdToken();
    if (!token) return false;

    const safeId = toSafeDocId(emailOrId);
    await Promise.all([
      httpsRequest(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/super_x_accounts/${safeId}`,
        "DELETE",
        { Authorization: `Bearer ${token}` }
      ),
      httpsRequest(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${safeId}`,
        "DELETE",
        { Authorization: `Bearer ${token}` }
      ),
    ]);
    return true;
  } catch (err: any) {
    console.warn("[Firebase Admin Sync] deleteAccountFromFirestore error:", err.message);
    return false;
  }
}

export async function purgeAllFirestoreAccountsExcept(preserveEmail: string): Promise<number> {
  try {
    const cleanPreserve = preserveEmail.toLowerCase().trim();
    const remoteAccounts = await fetchRemoteAccountsFromFirestore();
    let deletedCount = 0;

    for (const acc of remoteAccounts) {
      const emailClean = (acc.email || "").toLowerCase().trim();
      if (emailClean && emailClean !== cleanPreserve) {
        await deleteAccountFromFirestore(emailClean);
        if (acc.id) {
          await deleteAccountFromFirestore(acc.id);
        }
        deletedCount++;
      }
    }
    console.log(`[Firebase Admin Sync] Purged ${deletedCount} non-admin accounts from Firestore.`);
    return deletedCount;
  } catch (err: any) {
    console.warn("[Firebase Admin Sync] purgeAllFirestoreAccountsExcept error:", err?.message);
    return 0;
  }
}

export async function verifyWithFirebaseAuth(
  email: string,
  pass: string
): Promise<{ success: boolean; localId?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const authPassword = cleanPass.length < 6 ? cleanPass + "123456" : cleanPass;

    let postData = JSON.stringify({
      email: cleanEmail,
      password: authPassword,
      returnSecureToken: true,
    });

    let res = await httpsRequest(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      "POST",
      { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(postData)) },
      postData
    );

    if (res.status === 200) {
      const data = JSON.parse(res.body);
      return { success: true, localId: data.localId };
    }

    if (cleanPass !== authPassword) {
      postData = JSON.stringify({
        email: cleanEmail,
        password: cleanPass,
        returnSecureToken: true,
      });
      res = await httpsRequest(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        "POST",
        { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(postData)) },
        postData
      );
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        return { success: true, localId: data.localId };
      }
    }
  } catch {}
  return { success: false };
}

export async function registerInFirebaseAuth(email: string, pass: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const authPassword = cleanPass.length < 6 ? cleanPass + "123456" : cleanPass;

    const postData = JSON.stringify({
      email: cleanEmail,
      password: authPassword,
      returnSecureToken: true,
    });

    const res = await httpsRequest(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      "POST",
      { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(postData)) },
      postData
    );

    return res.status === 200;
  } catch {
    return false;
  }
}

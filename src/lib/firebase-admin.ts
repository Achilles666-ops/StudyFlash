import admin from 'firebase-admin';

let isInitialized = false;

function ensureFirebaseAdmin() {
  if (isInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not fully configured. Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your environment/Settings."
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
  }
  isInitialized = true;
}

// Proxy for adminFirestore to achieve graceful lazy initialization
export const adminFirestore = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop, receiver) {
    ensureFirebaseAdmin();
    const db = admin.firestore();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  }
});

export const adminDb = adminFirestore;
export { admin };

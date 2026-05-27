import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let isInitialized = false;
let databaseId: string | undefined = undefined;

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

  // Load backend firestoreDatabaseId if configured in workspace
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config && config.firestoreDatabaseId) {
        databaseId = config.firestoreDatabaseId;
        console.log(`[firebase-admin] Detected custom firestoreDatabaseId: ${databaseId}`);
      }
    }
  } catch (err) {
    console.warn('[firebase-admin] Could not read firebase-applet-config.json for databaseId, defaulting to standard', err);
  }

  isInitialized = true;
}

// Proxy for adminFirestore to achieve graceful lazy initialization
export const adminFirestore = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop, receiver) {
    ensureFirebaseAdmin();
    const app = admin.apps[0];
    const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  }
});

export const adminDb = adminFirestore;
export { admin };

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize with default credentials and explicit custom resources
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: firebaseConfig.storageBucket
  });
}

export { admin };
export const adminDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseConfig.firestoreDatabaseId)
  : getFirestore();
export const adminStorage = admin.storage();



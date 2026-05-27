import * as admin from 'firebase-admin';

// Initialize with default credentials assuming App Engine/Cloud Run environment
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

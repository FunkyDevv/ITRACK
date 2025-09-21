import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with service account
if (getApps().length === 0) {
  const serviceAccount = {
    type: "service_account",
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };

  initializeApp({
    credential: cert(serviceAccount),
    projectId: "ipack-ddfcd"
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();

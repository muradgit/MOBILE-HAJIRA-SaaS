import * as admin from "firebase-admin";

export { admin };

const getAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : undefined;

  return admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
};

const adminApp = getAdminApp();
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
export const adminMessaging = admin.messaging(adminApp);

// Only if a specific databaseId is needed (for Multi-DB setup)
const databaseId = process.env.FIREBASE_DATABASE_ID;
if (databaseId) {
  // admin.firestore(adminApp) handles default, but for specific DB:
  // export const adminCustomDb = admin.firestore(adminApp, databaseId);
}

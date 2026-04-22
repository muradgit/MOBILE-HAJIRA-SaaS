import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (error) {
  console.error("Failed to load firebase-applet-config.json:", error);
}

if (!admin.apps || admin.apps.length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;

  if (serviceAccount) {
    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      
      // Fix for Vercel/Env var newline escaping
      if (parsedServiceAccount.private_key) {
        parsedServiceAccount.private_key = parsedServiceAccount.private_key
          .replace(/\\n/g, "\n")
          .replace(/"/g, "")
          .trim();
      }

      admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount),
        databaseURL: projectId ? `https://${projectId}.firebaseio.com` : undefined
      });
    } catch (e) {
      console.error("Firebase Admin JSON Parse/Init Error:", e);
      admin.initializeApp({ projectId });
    }
  } else {
    admin.initializeApp({ projectId });
  }
}

export const adminAuth = admin.auth();
const databaseId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
export const adminDb = databaseId 
  ? getFirestore(admin.app(), databaseId)
  : getFirestore(admin.app());
export { admin };

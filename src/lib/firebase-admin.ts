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
      let parsedServiceAccount;
      if (serviceAccount.trim().startsWith("{")) {
        parsedServiceAccount = JSON.parse(serviceAccount);
      } else {
        // Not JSON, maybe it's just the private key? 
        // We really need the full service account for doc-based auth, 
        // but let's try to handle cases where it's just the key.
        throw new Error("Service account is not a valid JSON string");
      }
      
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
      if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn("Firebase Admin Init Warning (Build/Dev): Using default credentials or projectId only.");
      } else {
        console.error("Firebase Admin JSON Parse/Init Error:", e);
      }
      
      try {
        admin.initializeApp({ projectId });
      } catch (initErr) {
        // Fallback for build phase if everything else fails
        if (!admin.apps.length) {
          admin.initializeApp({ projectId: projectId || 'placeholder-for-build' });
        }
      }
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

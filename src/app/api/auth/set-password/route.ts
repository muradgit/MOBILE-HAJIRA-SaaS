import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

/**
 * Securely set or change user password via Admin SDK
 * This is used from the Profile page.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorResponse("Unauthorized", 401);

  try {
    const { password } = await req.json();

    if (!password || password.length < 6) {
      return errorResponse("Password must be at least 6 characters.", 400);
    }

    // 1. Update Password in Firebase Auth
    await adminAuth.updateUser(auth.uid, {
      password: password,
    });

    // 2. Update Firestore Status
    const userRef = adminDb.collection("users").doc(auth.uid);
    const updates = {
      has_password: true,
      updated_at: new Date().toISOString()
    };
    
    await userRef.update(updates);

    // Also update subcollection if user belongs to a tenant
    const userData = (await userRef.get()).data();
    if (userData?.tenant_id && userData.role) {
      const lowerRole = userData.role.toLowerCase();
      if (lowerRole === "teacher" || lowerRole === "student") {
        const subColl = lowerRole === "teacher" ? "teachers" : "students";
        try {
          await adminDb
            .collection("tenants")
            .doc(userData.tenant_id)
            .collection(subColl)
            .doc(auth.uid)
            .update(updates);
        } catch (e) {
          console.warn("Subcollection password flag update skipped:", e);
        }
      }
    }

    return successResponse({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("[SetPassword API] Error:", error);
    return errorResponse(error.message, 500);
  }
}

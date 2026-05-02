import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { errorResponse, successResponse } from "@/src/lib/api-utils";

/**
 * Resolve Identifier (Username/Email) to Auth Email
 * Used on Login Page to handle shadow emails without exposing database to unauthenticated users.
 */
export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return errorResponse("Identifier is required", 400);
    }

    // 1. If it's already an email, just return it (no need to resolve)
    if (identifier.includes("@")) {
      return successResponse({ email: identifier });
    }

    // 2. Query Firestore by username (Securely on server)
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.where("username", "==", identifier).limit(1).get();

    if (snapshot.empty) {
      return errorResponse("এই ইউজার আইডিটি খুঁজে পাওয়া যায়নি।", 404);
    }

    const userData = snapshot.docs[0].data();
    const finalEmail = userData.email || `${identifier}_${userData.tenant_id}@internal.com`.toLowerCase();

    return successResponse({ 
      email: finalEmail,
      tenant_id: userData.tenant_id,
      name: userData.name 
    });
  } catch (error: any) {
    console.error("[Auth Resolve] Error:", error);
    return errorResponse("Error resolving identifier", 500);
  }
}

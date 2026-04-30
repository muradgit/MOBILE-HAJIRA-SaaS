import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";
import { queueGoogleSheetSync } from "@/src/lib/qstash";

/**
 * Manage Teachers and Students (Admin Only)
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorResponse("Unauthorized", 401);
  const role = auth.role as string;
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole !== "admin" && normalizedRole !== "institutionadmin" && normalizedRole !== "superadmin" && normalizedRole !== "super-admin") {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await req.json();
    const { tenant_id, role, name, email, password, extra_data } = body;

    if (!tenant_id || !role || !name || !email || !password) {
      return errorResponse("Missing required fields", 400);
    }

    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Set Custom Claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      tenant_id,
    });

    // 3. Save to Firestore (Both top-level and subcollection)
    // CRITICAL: Ensure password string never leaks to Firestore
    const sanitizedExtraData = { ...extra_data };
    if (sanitizedExtraData.password) delete sanitizedExtraData.password;

    const profileData = {
      user_id: userRecord.uid,
      tenant_id,
      name,
      email,
      role,
      has_password: true, // Known to be true because registration requires it or admin set it
      status: "approved",
      created_at: new Date().toISOString(),
      ...sanitizedExtraData,
    };

    // TOP-LEVEL USERS COLLECTION (Required for generic login/auth hooks)
    await adminDb.collection("users").doc(userRecord.uid).set(profileData);

    // TENANT SUBCOLLECTION (Required for institution specific views and GS sync)
    const collectionName = role === "teacher" ? "teachers" : "students";
    await adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(userRecord.uid).set(profileData);

    // 4. Queue Sync to Google Sheets
    const syncType = role === "teacher" ? "TEACHER" : "STUDENT";
    await queueGoogleSheetSync(tenant_id, profileData, syncType);

    return successResponse({ success: true, user_id: userRecord.uid });
  } catch (error: any) {
    console.error("[Admin User Manage] POST Error:", error);
    return errorResponse(error.message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { tenant_id, user_id, role, updates } = body;

    if (!tenant_id || !user_id || !role || !updates) {
      return errorResponse("Missing required fields", 400);
    }

    // 1. Handle Password Update in Firebase Auth if provided
    if (updates.password) {
      await adminAuth.updateUser(user_id, {
        password: updates.password,
      });
      // Mark has_password in Firestore
      updates.has_password = true;
      // We don't want to store plain text password in Firestore
      delete updates.password;
    }

    const collectionName = role === "teacher" ? "teachers" : "students";
    const subRef = adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(user_id);
    const globalRef = adminDb.collection("users").doc(user_id);
    
    const finalUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // 2. Update Both Firestore Locations
    await Promise.all([
      subRef.update(finalUpdates),
      globalRef.update(finalUpdates).catch(() => console.warn("Global user doc missing for", user_id))
    ]);

    // 3. Get fresh data for sync
    const updatedDoc = await subRef.get();
    const fullData = updatedDoc.data();

    // Queue Sync to Google Sheets
    const syncType = role === "teacher" ? "TEACHER" : "STUDENT";
    await queueGoogleSheetSync(tenant_id, fullData, syncType);

    return successResponse({ success: true });
  } catch (error: any) {
    console.error("[Admin User Manage] PUT Error:", error);
    return errorResponse(error.message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorResponse("Unauthorized", 401);

  try {
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get("tenant_id");
    const user_id = searchParams.get("user_id");
    const role = searchParams.get("role");

    if (!tenant_id || !user_id || !role) {
      return errorResponse("Missing params", 400);
    }

    const collectionName = role === "teacher" ? "teachers" : "students";
    const userRef = adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(user_id);

    // Soft delete
    await userRef.update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    });

    // Sync status update to sheet
    const updatedDoc = await userRef.get();
    const syncType = role === "teacher" ? "TEACHER" : "STUDENT";
    await queueGoogleSheetSync(tenant_id, updatedDoc.data(), syncType);

    return successResponse({ success: true });
  } catch (error: any) {
    console.error("[Admin User Manage] DELETE Error:", error);
    return errorResponse(error.message, 500);
  }
}

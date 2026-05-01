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
  const normalizedRole = role?.toLowerCase().replace(/\s+/g, "");
  if (!["admin", "institutionadmin", "superadmin", "super-admin", "teacher"].includes(normalizedRole)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await req.json();
    const { tenant_id, role: targetRole, name, identifier, identifierType, password, extra_data } = body;

    if (!tenant_id || !targetRole || !name || !identifier || !password) {
      return errorResponse("Missing required fields", 400);
    }

    // 0. Hierarchy Rules Enforcement
    const creatorRole = (auth.role as string).toLowerCase().replace(/\s+/g, "");
    const normalizedTargetRole = targetRole.toLowerCase().replace(/\s+/g, "");

    const isSuperAdmin = ["superadmin", "super-admin"].includes(creatorRole);
    const isInstitutionAdmin = ["institutionadmin", "admin"].includes(creatorRole);
    const isTeacher = creatorRole === "teacher";

    let isAuthorized = false;

    if (isSuperAdmin) {
      // Super Admin can create anything
      isAuthorized = true;
    } else if (isInstitutionAdmin) {
      // Admin can create Teacher and Student
      if (["teacher", "student"].includes(normalizedTargetRole)) {
        isAuthorized = true;
      }
    } else if (isTeacher) {
      // Teacher can ONLY create Student
      if (normalizedTargetRole === "student") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(`আপনার (${auth.role}) ইউজার টাইপ দিয়ে এই রোলের (${targetRole}) ইউজার তৈরি করা সম্ভব নয়।`, 403);
    }

    // 1. Determine Email & Verification Status
    let finalEmail = identifier;
    let emailVerified = false;

    const isExplicitUsername = identifierType === "username";
    const isImplicitUsername = !identifierType && !identifier.includes("@");

    if (isExplicitUsername || isImplicitUsername) {
      // Shadow Email Pattern
      finalEmail = `${identifier}_${tenant_id}@internal.com`.toLowerCase();
      emailVerified = true; // Auto-verify shadow emails
    }

    // Check if user already exists in auth
    try {
      const existingUser = await adminAuth.getUserByEmail(finalEmail).catch(() => null);
      if (existingUser) {
        return errorResponse("এই ইউজার আইডি বা ইমেইল ইতিমধ্যে ব্যবহার করা হয়েছে।", 400);
      }
    } catch (e) {
      // ignore
    }

    // 2. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: finalEmail,
      emailVerified,
      password,
      displayName: name,
    });

    // 3. Set Custom Claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: targetRole,
      tenant_id,
    });

    // 4. Save to Firestore
    const profileData = {
      user_id: userRecord.uid,
      tenant_id,
      name,
      email: finalEmail,
      role: targetRole,
      username: identifierType === "username" ? identifier : null,
      identifierType: identifierType || "email",
      has_password: true,
      status: "approved",
      created_at: new Date().toISOString(),
      ...extra_data,
    };
    
    delete (profileData as any).password;

    // TOP-LEVEL USERS COLLECTION
    await adminDb.collection("users").doc(userRecord.uid).set(profileData);

    // TENANT SUBCOLLECTION
    let collectionName = "students";
    if (normalizedTargetRole === "teacher") collectionName = "teachers";
    if (normalizedTargetRole === "institutionadmin" || normalizedTargetRole === "admin") collectionName = "admins";

    await adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(userRecord.uid).set(profileData);

    // 5. Queue Sync to Google Sheets
    const syncType = normalizedTargetRole === "teacher" ? "TEACHER" : "STUDENT";
    if (syncType) {
      await queueGoogleSheetSync(tenant_id, profileData, syncType).catch(e => console.error("Sheet sync failed", e));
    }

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

    // Hierarchy Check
    const creatorRole = (auth.role as string).toLowerCase().replace(/\s+/g, "");
    const targetRole = role.toLowerCase().replace(/\s+/g, "");
    const isAuthorized = 
      ["superadmin", "super-admin"].includes(creatorRole) || 
      (["institutionadmin", "admin"].includes(creatorRole) && ["teacher", "student"].includes(targetRole)) ||
      (creatorRole === "teacher" && targetRole === "student");

    if (!isAuthorized) return errorResponse("উক্ত পরিবর্তন করার অনুমতি আপনার নেই।", 403);

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

    // Hierarchy Check
    const creatorRole = (auth.role as string).toLowerCase().replace(/\s+/g, "");
    const targetRole = role.toLowerCase().replace(/\s+/g, "");
    const isAuthorized = 
      ["superadmin", "super-admin"].includes(creatorRole) || 
      (["institutionadmin", "admin"].includes(creatorRole) && ["teacher", "student"].includes(targetRole)) ||
      (creatorRole === "teacher" && targetRole === "student");

    if (!isAuthorized) return errorResponse("উক্ত ইউজারকে ডিলিট করার অনুমতি আপনার নেই।", 403);

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

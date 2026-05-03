import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";
import { queueGoogleSheetSync } from "@/src/lib/qstash";
import { normalizeRole } from "@/src/lib/auth-utils";

/**
 * Manage Teachers and Students (Admin Only)
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorResponse("Unauthorized", 401);
  const normalizedRole = normalizeRole(auth.role as string);
  
  if (!["super_admin", "institute_admin", "teacher"].includes(normalizedRole)) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await req.json();
    const { tenant_id, role: targetRole, name, identifier, identifierType, password, extra_data } = body;

    // Tenant Isolation Check
    if (normalizedRole === "institute_admin" && tenant_id !== auth.tenant_id) {
       return errorResponse("একই ইনস্টিটিউটের বাইরে ইউজার তৈরি করার অনুমতি আপনার নেই।", 403);
    }

    if (!tenant_id || !targetRole || !name || !identifier || !password) {
      return errorResponse("Missing required fields", 400);
    }

    // 0. Hierarchy Rules Enforcement
    const creatorRole = normalizedRole;
    let normalizedTargetRole = normalizeRole(targetRole);
    
    const isSuperAdmin = creatorRole === "super_admin";
    const isInstitutionAdmin = creatorRole === "institute_admin";
    const isTeacher = creatorRole === "teacher";

    let isAuthorized = false;

    if (isSuperAdmin) {
      // Super Admin can create institute_admin, teacher, student
      if (["institute_admin", "teacher", "student"].includes(normalizedTargetRole)) {
        isAuthorized = true;
      }
    } else if (isInstitutionAdmin) {
      // Admin can create teacher and student
      if (["teacher", "student"].includes(normalizedTargetRole)) {
        isAuthorized = true;
      }
    } else if (isTeacher) {
      // Teacher can ONLY create student
      if (normalizedTargetRole === "student") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(`আপনার (${auth.role}) ইউজার টাইপ দিয়ে এই রোলের (${targetRole}) ইউজার তৈরি করা সম্ভব নয়।`, 403);
    }

    const finalTargetRole = normalizedTargetRole;

    // 1. Determine Email & Verification Status
    let finalEmail = identifier;
    let emailVerified = false;

    const isExplicitUsername = identifierType === "username";
    const isImplicitUsername = !identifierType && !identifier.includes("@");

    if (isExplicitUsername || isImplicitUsername) {
      // Shadow Email Pattern: identifier_tenantId@internal.com
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
      role: finalTargetRole,
      tenant_id,
    });

    // 4. Save to Firestore (Atomic Batch Write)
    const batch = adminDb.batch();

    // Extract common fields for easy access and root storage
    const extra = extra_data || {};
    const studentClass = extra.class || body.class || null;
    const studentSection = extra.section || body.section || null;
    const studentSession = extra.session || body.session || null;
    const studentDepartment = extra.department || body.department || null;

    const profileData = {
      user_id: userRecord.uid,
      tenant_id,
      name,
      email: finalEmail,
      role: finalTargetRole,
      username: (isExplicitUsername || isImplicitUsername) ? identifier : null,
      identifierType: (isExplicitUsername || isImplicitUsername) ? "username" : "email",
      has_password: true,
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Root level access for queries (Attendance etc)
      class: studentClass,
      section: studentSection,
      session: studentSession,
      department: studentDepartment,
      phone: extra.phone || body.phone || null,
      student_id: extra.student_id || body.student_id || null,
      extra_data: extra,
    };
    
    // Global Reference
    const globalRef = adminDb.collection("users").doc(userRecord.uid);
    batch.set(globalRef, profileData);

    // Tenant Subcollection Reference
    let collectionName = "students";
    if (finalTargetRole === "teacher") collectionName = "teachers";
    if (finalTargetRole === "institute_admin") collectionName = "admins";

    const subRef = adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(userRecord.uid);
    batch.set(subRef, profileData);

    // Commit changes atomically
    await batch.commit();

    // 5. Queue Sync to Google Sheets
    const syncType = finalTargetRole === "teacher" ? "TEACHER" : (finalTargetRole === "student" ? "STUDENT" : null);
    if (syncType) {
      await queueGoogleSheetSync(tenant_id, profileData, syncType).catch(e => console.error("Sheet sync failed", e));
    }

    return successResponse({ success: true, user_id: userRecord.uid, requiresRefresh: true });
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
    const creatorRole = normalizeRole(auth.role as string);
    let normalizedTargetRole = normalizeRole(role);
    
    // Tenant Isolation
    if (creatorRole === "institute_admin" && tenant_id !== auth.tenant_id) {
       return errorResponse("একই ইনস্টিটিউটের বাইরে ইউজার পরিবর্তন করার অনুমতি আপনার নেই।", 403);
    }

    const isAuthorized = 
      creatorRole === "super_admin" || 
      (creatorRole === "institute_admin" && ["teacher", "student"].includes(normalizedTargetRole)) ||
      (creatorRole === "teacher" && normalizedTargetRole === "student");

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

    // 2. Update Custom Claims if role changed
    if (updates.role) {
      await adminAuth.setCustomUserClaims(user_id, {
        role: normalizeRole(updates.role),
        tenant_id: tenant_id,
      });
    }

    let collectionName = "students";
    if (normalizedTargetRole === "teacher") collectionName = "teachers";
    if (normalizedTargetRole === "institute_admin") collectionName = "admins";

    const globalRef = adminDb.collection("users").doc(user_id);
    const subRef = adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(user_id);

    // 2. Update Both Firestore Locations (Atomic Batch)
    const batch = adminDb.batch();

    const extra = updates.extra_data || {};
    const finalUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
      // Ensure root level fields are synced if they exist in updates or extra_data
      class: updates.class || extra.class || undefined,
      section: updates.section || extra.section || undefined,
      session: updates.session || extra.session || undefined,
      department: updates.department || extra.department || undefined,
      phone: updates.phone || extra.phone || undefined,
      student_id: updates.student_id || extra.student_id || undefined,
    };

    // Clean undefined
    Object.keys(finalUpdates).forEach(key => finalUpdates[key] === undefined && delete finalUpdates[key]);

    batch.update(subRef, finalUpdates);
    batch.update(globalRef, finalUpdates);
    
    await batch.commit().catch(async (err) => {
      // If global update fails because it doesn't exist, try updating subcollection only
      if (err.code === 5 || err.message.includes("NOT_FOUND")) {
        await subRef.update(finalUpdates);
      } else {
        throw err;
      }
    });

    // 3. Get fresh data for sync
    const updatedDoc = await subRef.get();
    const fullData = updatedDoc.data();

    // Queue Sync to Google Sheets
    const syncType = normalizedTargetRole === "teacher" ? "TEACHER" : (normalizedTargetRole === "student" ? "STUDENT" : null);
    if (syncType) {
      await queueGoogleSheetSync(tenant_id, fullData, syncType).catch(e => console.error("Sheet sync failed", e));
    }

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
    const role = searchParams.get("role") || "";

    if (!tenant_id || !user_id || !role) {
      return errorResponse("Missing params", 400);
    }

    // Hierarchy Check
    const creatorRole = normalizeRole(auth.role as string);
    let normalizedTargetRole = normalizeRole(role);

    // Tenant Isolation
    if (creatorRole === "institute_admin" && tenant_id !== auth.tenant_id) {
       return errorResponse("একই ইনস্টিটিউটের বাইরে ইউজার ডিলিট করার অনুমতি আপনার নেই।", 403);
    }

    const isAuthorized = 
      creatorRole === "super_admin" || 
      (creatorRole === "institute_admin" && ["teacher", "student"].includes(normalizedTargetRole)) ||
      (creatorRole === "teacher" && normalizedTargetRole === "student");

    if (!isAuthorized) return errorResponse("উক্ত ইউজারকে ডিলিট করার অনুমতি আপনার নেই।", 403);

    let collectionName = "students";
    if (normalizedTargetRole === "teacher") collectionName = "teachers";
    if (normalizedTargetRole === "institute_admin") collectionName = "admins";

    const subRef = adminDb.collection("tenants").doc(tenant_id).collection(collectionName).doc(user_id);
    const globalRef = adminDb.collection("users").doc(user_id);

    const deleteUpdates = {
      status: "deleted",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. If Super Admin, Hard Delete from Firebase Auth
    // This allows the identifier (email/username) to be reused immediately.
    let authDeleted = false;
    if (creatorRole === "super_admin") {
      try {
        await adminAuth.deleteUser(user_id);
        authDeleted = true;
      } catch (authErr: any) {
        console.error("[Admin User Delete] Auth Deletion Failed:", authErr);
        // If user not found in auth, we continue to cleanup Firestore
        if (authErr.code !== "auth/user-not-found") {
          return errorResponse("ইউজার অথেনটিকেশন থেকে ডিলিট করতে ব্যর্থ হয়েছে।", 500);
        }
      }
    }

    // 2. Soft delete in both Firestore locations (Atomic Batch)
    const batch = adminDb.batch();
    batch.update(subRef, deleteUpdates);
    batch.update(globalRef, deleteUpdates);
    
    await batch.commit().catch(async (err) => {
      if (err.code === 5 || err.message.includes("NOT_FOUND")) {
        await subRef.update(deleteUpdates).catch(() => null);
      } else {
        throw err;
      }
    });

    // 3. Sync status update to sheet
    const updatedDoc = await subRef.get();
    const syncType = normalizedTargetRole === "teacher" ? "TEACHER" : (normalizedTargetRole === "student" ? "STUDENT" : null);
    if (syncType && updatedDoc.exists) {
      await queueGoogleSheetSync(tenant_id, updatedDoc.data(), syncType).catch(e => console.error("Sheet sync failed", e));
    }

    return successResponse({ 
      success: true, 
      message: authDeleted ? "ইউজারটি স্থায়ীভাবে ডিলিট করা হয়েছে।" : "ইউজারটিকে সফলভাবে ইনঅ্যাক্টিভ করা হয়েছে।" 
    });
  } catch (error: any) {
    console.error("[Admin User Manage] DELETE Error:", error);
    return errorResponse(error.message, 500);
  }
}

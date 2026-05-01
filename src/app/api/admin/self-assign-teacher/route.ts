import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";
import { queueGoogleSheetSync } from "@/src/lib/qstash";

/**
 * Institution Admin Self-Assigns as Teacher
 */
export async function POST(req: NextRequest) {
  const authUser = await authenticate(req);
  if (!authUser) return errorResponse("Unauthorized", 401);
  
  const role = (authUser.role as string)?.toLowerCase().replace(/[\s-]/g, "_");
  if (role !== "institute_admin" && role !== "institutionadmin" && role !== "admin" && role !== "super_admin" && role !== "superadmin") {
    return errorResponse("Forbidden: Only Admins can self-assign", 403);
  }

  try {
    const { tenant_id } = await req.json();
    
    // 1. Get current admin data
    const userRef = adminDb.collection("users").doc(authUser.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) return errorResponse("User data not found", 404);

    // Verify tenant
    const userTenantId = userData.tenant_id || authUser.tenant_id;
    if (!tenant_id || tenant_id !== userTenantId) {
      return errorResponse("Invalid tenant ID", 400);
    }

    // 2. Add to Teacher collection for the tenant
    const teacherProfile = {
      user_id: authUser.uid,
      tenant_id,
      name: userData.name,
      nameBN: userData.nameBN || "",
      email: userData.email,
      role: "teacher",
      status: "approved",
      created_at: new Date().toISOString(),
      is_admin_dual_role: true,
    };

    await adminDb.collection("tenants").doc(tenant_id).collection("teachers").doc(authUser.uid).set(teacherProfile);

    // 3. Mark admin user as dual role
    await userRef.update({
      is_also_teacher: true,
      updated_at: new Date().toISOString(),
    });

    // 4. Sync to Google Sheets
    await queueGoogleSheetSync(tenant_id, teacherProfile, "TEACHER");

    return successResponse({ success: true });
  } catch (error: any) {
    console.error("[Self Assign Teacher] Error:", error);
    return errorResponse(error.message, 500);
  }
}

import { NextRequest } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";
import { queueGoogleSheetSync } from "@/src/lib/qstash";

/**
 * API Route to submit attendance via QStash background queue.
 * Strict Rule: No attendance data is written to Firestore.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { tenant_id, teacher_id, student_id, student_name, class_name, date, status } = body;

    // Validate required fields
    if (!tenant_id || !teacher_id || !student_id || !date || !status) {
      return errorResponse("Missing required fields: tenant_id, teacher_id, student_id, date, status");
    }

    // 2. Fetch googleSheetId from Firestore (READ ONLY)
    const tenantDoc = await adminDb.collection("tenants").doc(tenant_id).get();
    if (!tenantDoc.exists) {
      return errorResponse("Institution not found", 404);
    }
    
    const tenantData = tenantDoc.data();
    const googleSheetId = tenantData?.googleSheetId;

    if (!googleSheetId) {
      return errorResponse("Google Sheet ID is not configured for this institution", 400);
    }

    // 3. Queue the background sync job to QStash
    // We send a more complete payload for the worker
    const attendanceData = {
      date,
      teacher_id,
      student_id,
      student_name: student_name || "N/A",
      class_name: class_name || "N/A",
      status
    };

    console.log(`[Attendance] Queuing sync for tenant: ${tenant_id}`);
    await queueGoogleSheetSync(tenant_id, attendanceData, "ATTENDANCE");

    // Success response - Job is now in the queue
    return successResponse({ 
      success: true, 
      message: "Attendance submission queued successfully. It will appear in Google Sheets shortly." 
    });

  } catch (error: any) {
    console.error("Attendance Submission Error:", error);
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

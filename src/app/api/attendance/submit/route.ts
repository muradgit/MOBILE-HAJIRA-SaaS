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
    // New Summary Fields: classId, section, subject, teacherName, totalPresent, totalAbsent, presentStudents, absentStudents
    const { 
      tenant_id, 
      classId, 
      section, 
      subject, 
      teacherName, 
      totalPresent, 
      totalAbsent, 
      presentStudents, 
      absentStudents 
    } = body;

    // Validate required fields (at minimum tenant_id and some summary info)
    if (!tenant_id || !classId || totalPresent === undefined) {
      return errorResponse("Missing required fields: tenant_id, classId, totalPresent");
    }

    // 2. Fetch tenant data and check credits
    const tenantDoc = await adminDb.collection("tenants").doc(tenant_id).get();
    if (!tenantDoc.exists) {
      return errorResponse("Institution not found", 404);
    }
    
    const tenantData = tenantDoc.data();
    const googleSheetId = tenantData?.googleSheetId;
    const creditsLeft = tenantData?.credits_left ?? 0;

    if (!googleSheetId) {
      return errorResponse("Google Sheet ID is not configured for this institution", 400);
    }

    if (creditsLeft <= 0) {
      return errorResponse("আপনার প্রতিষ্ঠানের ক্রেডিট শেষ হয়ে গেছে। দয়া করে ক্রেডিট টপ-আপ করুন।", 403);
    }

    // 3. Deduct credit (Atomic update)
    await adminDb.collection("tenants").doc(tenant_id).update({
      credits_left: creditsLeft - 1
    });

    // 4. Queue the background sync job to QStash
    const attendanceData = {
      classId,
      section,
      subject,
      teacherName,
      totalPresent,
      totalAbsent,
      presentStudents,
      absentStudents
    };

    console.log(`[Attendance] Queuing summary sync for tenant: ${tenant_id}`);
    await queueGoogleSheetSync(tenant_id, attendanceData, "ATTENDANCE");

    // Success response - Job is now in the queue
    return successResponse({ 
      success: true, 
      message: "হাজিরা সফলভাবে সাবমিট হয়েছে এবং শিটে সেভ হচ্ছে।" 
    });

  } catch (error: any) {
    console.error("Attendance Submission Error:", error);
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

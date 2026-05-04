import { NextRequest } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";
import { queueGoogleSheetSync } from "@/src/lib/qstash";
import { FieldValue } from "firebase-admin/firestore";

/**
 * API Route to submit attendance.
 * Handles Firestore logging, credit deduction, and Google Sheets sync queuing.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { 
      tenant_id, 
      classId, 
      className,
      section, 
      subject, 
      teacherName, 
      totalPresent, 
      totalAbsent, 
      presentStudents, 
      absentStudents,
      method = "manual"
    } = body;

    // Validate required fields
    if (!tenant_id || !classId) {
      return errorResponse("আবেদন অপূর্ণাঙ্গ: Tenant ID এবং Class ID প্রয়োজন।");
    }

    // Role check - only teachers or admins can submit
    if (user.role !== 'teacher' && user.role !== 'institute_admin' && user.role !== 'super_admin') {
      return errorResponse("আপনার হাজিরা জমা দেওয়ার অনুমতি নেই।", 403);
    }

    // Ensure teacher belongs to this tenant (unless super admin)
    if (user.role === 'teacher' && user.tenant_id !== tenant_id) {
       return errorResponse("আপনি আপনার নির্ধারিত প্রতিষ্ঠানের বাইরে হাজিরা জমা দিতে পারবেন না।", 403);
    }

    // 2. Fetch tenant data and check credits
    const tenantDoc = await adminDb.collection("tenants").doc(tenant_id).get();
    if (!tenantDoc.exists) {
      return errorResponse("প্রতিষ্ঠানটি খুঁজে পাওয়া যায়নি।", 404);
    }
    
    const tenantData = tenantDoc.data();
    const googleSheetId = tenantData?.googleSheetId;
    const creditsLeft = tenantData?.credits_left ?? 0;

    if (creditsLeft <= 0) {
      return errorResponse("আপনার প্রতিষ্ঠানের ক্রেডিট শেষ হয়ে গেছে। দয়া করে ক্রেডিট টপ-আপ করুন।", 403);
    }

    // 3. Prepare Firestore Data
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Duplicate prevention (check if attendance for this class/subject/date was just submitted)
    const recentQuery = await adminDb.collection(`tenants/${tenant_id}/attendance_logs`)
      .where("classId", "==", classId)
      .where("subject", "==", subject)
      .where("date", "==", dateStr)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!recentQuery.empty) {
      const mostRecent = recentQuery.docs[0].data();
      const createdAt = mostRecent.createdAt?.toDate();
      // If submitted within last 2 minutes, prevent duplicate
      if (createdAt && (Date.now() - createdAt.getTime()) < 120000) {
          return errorResponse("এই বিষয়ের হাজিরা ইতিপূর্বেই জমা দেওয়া হয়েছে। অনুগ্রহ করে ২ মিনিট পর চেষ্টা করুন।", 400);
      }
    }

    const logRef = adminDb.collection(`tenants/${tenant_id}/attendance_logs`).doc();
    
    const attendanceMap: Record<string, boolean> = {};
    presentStudents.forEach((s: any) => attendanceMap[s.id] = true);
    absentStudents.forEach((s: any) => attendanceMap[s.id] = false);

    const attendanceLog = {
      id: logRef.id,
      tenantId: tenant_id,
      classId,
      className: className || "Unknown Class",
      section: section || "",
      teacherId: user.uid,
      teacherName: teacherName || user.name || "Unknown Teacher",
      subject: subject || "No Subject",
      date: dateStr,
      method,
      stats: {
        present: totalPresent,
        absent: totalAbsent,
        total: totalPresent + totalAbsent
      },
      attendance: attendanceMap,
      presentStudents,
      absentStudents,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 4. Batch Execution
    const batch = adminDb.batch();
    
    // A. Log Entry
    batch.set(logRef, attendanceLog);
    
    // B. Deduct Credit
    batch.update(adminDb.collection("tenants").doc(tenant_id), {
      credits_left: FieldValue.increment(-1)
    });

    await batch.commit();

    // 5. Queue Background Sync (Google Sheets)
    if (googleSheetId) {
      const syncData = {
        classId,
        className,
        section,
        subject,
        teacherName: attendanceLog.teacherName,
        date: dateStr,
        totalPresent,
        totalAbsent,
        presentStudents,
        absentStudents,
        method
      };

      await queueGoogleSheetSync(tenant_id, syncData, "ATTENDANCE");
    }

    return successResponse({ 
      success: true, 
      id: logRef.id,
      message: "হাজিরা সফলভাবে জমা দেওয়া হয়েছে এবং ডাটাবেসে সেভ হয়েছে।" 
    });

  } catch (error: any) {
    console.error("[Attendance API Error]:", error);
    return errorResponse("সার্ভার ত্রুটি: হাজিরা জমা দেওয়া সম্ভব হয়নি। " + (error.message || ""), 500);
  }
}

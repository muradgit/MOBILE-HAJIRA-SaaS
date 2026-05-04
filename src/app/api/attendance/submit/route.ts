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
      academicLevel,
      session,
      section, 
      subject,
      teacher_id,
      teacherName, 
      totalPresent, 
      totalAbsent, 
      presentStudents, 
      absentStudents,
      attendance_method,
      method = "manual"
    } = body;
    
    // Use attendance_method if provided, otherwise fallback to method
    const finalMethod = attendance_method || method;

    // Validate required fields
    if (!tenant_id || !classId) {
      return errorResponse("আবেদন অপূর্ণাঙ্গ: Tenant ID এবং Class ID প্রয়োজন।");
    }

    const isStudent = user.role === 'student';

    // Role check - only teachers, admins, or students (for self check-in)
    if (!isStudent && user.role !== 'teacher' && user.role !== 'institute_admin' && user.role !== 'super_admin') {
      return errorResponse("আপনার হাজিরা জমা দেওয়ার অনুমতি নেই।", 403);
    }

    // Ensure user belongs to this tenant
    if (user.tenant_id !== tenant_id && user.role !== 'super_admin') {
       return errorResponse("আপনি আপনার নির্ধারিত প্রতিষ্ঠানের বাইরে হাজিরা জমা দিতে পারবেন না।", 403);
    }

    // If student is submitting, it's a "Check-in"
    if (isStudent) {
       // Validate that this student is only submitting for themselves
       if (presentStudents && presentStudents.length > 0 && presentStudents[0].id !== user.uid) {
         return errorResponse("আপনি অন্য কারো হাজিরা দিতে পারবেন না।", 403);
       }

       const checkinRef = adminDb.collection(`tenants/${tenant_id}/attendance_entries`).doc();
       const checkinData = {
         id: checkinRef.id,
         tenantId: tenant_id,
         classId,
         studentId: user.uid,
         name: user.name,
         method: finalMethod,
         code: body.code || "",
         location: body.location || null,
         createdAt: FieldValue.serverTimestamp(),
       };

       await checkinRef.set(checkinData);

       return successResponse({ 
         success: true, 
         id: checkinRef.id,
         message: "আপনার হাজিরা সফলভাবে গ্রহণ করা হয়েছে।" 
       });
    }

    // --- FROM HERE: TEACHER SUBMISSION LOGIC ---

    // 2. Fetch tenant data and check credits within a transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      const tenantRef = adminDb.collection("tenants").doc(tenant_id);
      const tenantDoc = await transaction.get(tenantRef);
      
      if (!tenantDoc.exists) {
        throw new Error("প্রতিষ্ঠানটি খুঁজে পাওয়া যায়নি।");
      }
      
      const tenantData = tenantDoc.data();
      const currentCredits = tenantData?.credits ?? tenantData?.credits_left ?? 0;
      const googleSheetId = tenantData?.googleSheetId;

      if (currentCredits < 2) {
        throw new Error("যথেষ্ট ক্রেডিট নেই। দয়া করে রিচার্জ করুন।");
      }

      // Prepare Logic
      const dateStr = new Date().toISOString().split('T')[0];
      const logRef = adminDb.collection(`tenants/${tenant_id}/attendance_logs`).doc();
      
      const attendanceMap: Record<string, boolean> = {};
      presentStudents.forEach((s: any) => attendanceMap[s.id] = true);
      absentStudents.forEach((s: any) => attendanceMap[s.id] = false);

      const attendanceLog = {
        id: logRef.id,
        tenantId: tenant_id,
        classId,
        className: className || "Unknown Class",
        academicLevel: academicLevel || "",
        session: session || "",
        section: section || "",
        teacherId: teacher_id || user.uid,
        teacherName: teacherName || user.name || "Unknown Teacher",
        subject: subject || "No Subject",
        date: dateStr,
        method: finalMethod,
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

      // Execution in transaction
      // A. Log Entry
      transaction.set(logRef, attendanceLog);
      
      // B. Deduct Credit (2 credits per submission)
      transaction.update(tenantRef, {
        credits: FieldValue.increment(-2),
        credits_left: FieldValue.increment(-2),
        updatedAt: FieldValue.serverTimestamp()
      });

      // C. Log Credit History
      const historyRef = tenantRef.collection("credit_history").doc();
      transaction.set(historyRef, {
        amount: -2,
        type: "deduction",
        description: `Attendance Submission: ${className || 'Class'} (${subject || 'No Subject'})`,
        timestamp: FieldValue.serverTimestamp(),
        previous_balance: currentCredits,
        new_balance: currentCredits - 2,
        reference_id: logRef.id
      });

      return { logId: logRef.id, googleSheetId, dateStr, teacherName: attendanceLog.teacherName };
    });

    const { logId, googleSheetId, dateStr, teacherName: logTeacherName } = result;

    // 5. Queue Background Sync (Google Sheets)
    if (googleSheetId) {
      const syncData = {
        classId,
        className,
        section,
        subject,
        teacherName: logTeacherName,
        date: dateStr,
        totalPresent,
        totalAbsent,
        presentStudents,
        absentStudents,
        method: finalMethod
      };

      await queueGoogleSheetSync(tenant_id, syncData, "ATTENDANCE");
    }

    return successResponse({ 
      success: true, 
      id: logId,
      message: "হাজিরা সফলভাবে জমা দেওয়া হয়েছে এবং ডাটাবেসে সেভ হয়েছে।" 
    });

  } catch (error: any) {
    console.error("[Attendance API Error]:", error);
    return errorResponse("সার্ভার ত্রুটি: হাজিরা জমা দেওয়া সম্ভব হয়নি। " + (error.message || ""), 500);
  }
}

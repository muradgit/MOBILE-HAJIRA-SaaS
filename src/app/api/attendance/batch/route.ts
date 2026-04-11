import { NextRequest } from "next/server";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { tenant_id, student_ids, teacher_id, subject } = body;

  if (!tenant_id || !student_ids || !Array.isArray(student_ids) || !teacher_id || !subject) {
    return errorResponse("Missing or invalid required fields");
  }

  try {
    const tenantRef = adminDb.collection("tenants").doc(tenant_id);
    
    await adminDb.runTransaction(async (transaction) => {
      const tenantDoc = await transaction.get(tenantRef);
      if (!tenantDoc.exists) throw new Error("Tenant not found");
      
      const tenantData = tenantDoc.data();
      if (!tenantData || tenantData.credits_left < 2) {
        throw new Error("Insufficient credits");
      }

      const now = admin.firestore.Timestamp.now();
      const fortyFiveMinsAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 45 * 60 * 1000);

      for (const studentId of student_ids) {
        const recentAttendance = await adminDb.collection("tenants").doc(tenant_id)
          .collection("attendance")
          .where("student_id", "==", studentId)
          .where("subject", "==", subject)
          .where("timestamp", ">=", fortyFiveMinsAgo)
          .limit(1)
          .get();

        if (recentAttendance.empty) {
          const attendanceRef = adminDb.collection("tenants").doc(tenant_id).collection("attendance").doc();
          transaction.set(attendanceRef, {
            timestamp: now,
            tenant_id,
            student_id: studentId,
            teacher_id,
            subject,
            status: "present"
          });
        }
      }

      transaction.update(tenantRef, {
        credits_left: admin.firestore.FieldValue.increment(-2)
      });
    });

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

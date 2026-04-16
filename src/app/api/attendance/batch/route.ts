import { NextRequest } from "next/server";
import { google } from "googleapis";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

/**
 * API Route to submit batch attendance to Google Sheets.
 * Decrements credits in Firestore but does NOT store attendance records there.
 */
export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { tenant_id, student_ids, teacher_id, date, status = "Present" } = body;

    if (!tenant_id || !student_ids || !Array.isArray(student_ids) || !teacher_id || !date) {
      return errorResponse("Missing or invalid required fields: tenant_id, student_ids, teacher_id, date");
    }

    // 1. Fetch googleSheetId and check credits in a transaction
    const tenantRef = adminDb.collection("tenants").doc(tenant_id);
    let googleSheetId = "";

    await adminDb.runTransaction(async (transaction) => {
      const tenantDoc = await transaction.get(tenantRef);
      if (!tenantDoc.exists) throw new Error("Institution not found");
      
      const tenantData = tenantDoc.data();
      if (!tenantData) throw new Error("Invalid institution data");
      
      if (tenantData.credits_left < 1) {
        throw new Error("Insufficient credits to perform this operation");
      }

      googleSheetId = tenantData.googleSheetId;
      if (!googleSheetId) {
        throw new Error("Google Sheet ID is not configured for this institution");
      }

      // Decrement credits (e.g., 1 credit per batch submission)
      transaction.update(tenantRef, {
        credits_left: admin.firestore.FieldValue.increment(-1)
      });
    });

    // 2. Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 3. Prepare rows for batch append
    // Row format: [Date, Teacher ID, Student ID, Status]
    const rows = student_ids.map(studentId => [date, teacher_id, studentId, status]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: googleSheetId,
      range: "Sheet1!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    return successResponse({ 
      success: true, 
      message: `Attendance for ${student_ids.length} students recorded in Google Sheets` 
    });

  } catch (error: any) {
    console.error("Batch Attendance Error:", error);
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

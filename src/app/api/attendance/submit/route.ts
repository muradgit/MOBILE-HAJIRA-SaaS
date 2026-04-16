import { NextRequest } from "next/server";
import { google } from "googleapis";
import { adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

/**
 * API Route to submit attendance directly to Google Sheets.
 * Strict Rule: No attendance data is written to Firestore.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { tenant_id, teacher_id, student_id, date, status } = body;

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

    // 3. Authenticate with Google Sheets API using Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // Handle potential newline issues in private key from env variables
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 4. Append the attendance record as a new row
    // Row format: [Date, Teacher ID, Student ID, Status]
    await sheets.spreadsheets.values.append({
      spreadsheetId: googleSheetId,
      range: "Sheet1!A:D", // Assumes the target sheet is named 'Sheet1'
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, teacher_id, student_id, status]],
      },
    });

    // Success response - No Firestore write performed for attendance data
    return successResponse({ 
      success: true, 
      message: "Attendance successfully recorded in Google Sheets" 
    });

  } catch (error: any) {
    console.error("Google Sheets API Error:", error);
    
    // Handle specific Google API errors
    if (error.code === 403) {
      return errorResponse("Permission denied: Ensure the service account has 'Editor' access to the Google Sheet", 403);
    }
    if (error.code === 404) {
      return errorResponse("Google Sheet not found: Check if the googleSheetId is correct", 404);
    }

    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

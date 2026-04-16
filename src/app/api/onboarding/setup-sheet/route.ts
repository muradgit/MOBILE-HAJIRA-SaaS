import { NextRequest } from "next/server";
import { google } from "googleapis";
import { adminDb } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

/**
 * API Route for automated onboarding:
 * 1. Creates a Google Sheet in the Admin's Drive.
 * 2. Sets up headers.
 * 3. Shares it with the system's Service Account.
 * 4. Saves the Sheet ID to Firestore.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate the user (Firebase Auth)
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  try {
    const body = await req.json();
    const { access_token, tenant_id, institution_name } = body;

    // Validate required fields
    if (!access_token || !tenant_id || !institution_name) {
      return errorResponse("Missing required fields: access_token, tenant_id, institution_name");
    }

    // 2. Authorization Check: Ensure user belongs to this tenant or is SuperAdmin
    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
    
    if (!userData || (userData.tenant_id !== tenant_id && userData.role !== "SuperAdmin")) {
      return errorResponse("Unauthorized: You do not have permission to configure this institution", 403);
    }

    // 3. Authenticate with Google on behalf of the Admin using OAuth2 access_token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token });

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    // 4. Create a new Google Spreadsheet in the Admin's Drive
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Mobile Hajira Master - ${institution_name}`,
        },
      },
    });

    const googleSheetId = spreadsheet.data.spreadsheetId;
    if (!googleSheetId) {
      throw new Error("Failed to create spreadsheet");
    }

    // 5. Set up basic headers in Sheet1: [Date, Teacher ID, Student ID, Status]
    await sheets.spreadsheets.values.update({
      spreadsheetId: googleSheetId,
      range: "Sheet1!A1:D1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Date", "Teacher ID", "Student ID", "Status"]],
      },
    });

    // 6. Auto-Share: Add our Service Account as Editor (writer)
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    if (!serviceAccountEmail) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is missing");
    }

    await drive.permissions.create({
      fileId: googleSheetId,
      requestBody: {
        type: "user",
        role: "writer", // "writer" gives Editor access
        emailAddress: serviceAccountEmail,
      },
      // Send notification email is false to keep it silent
      sendNotificationEmail: false,
    });

    // 7. Save the new googleSheetId to the Firestore tenant document
    await adminDb.collection("tenants").doc(tenant_id).update({
      googleSheetId: googleSheetId,
    });

    return successResponse({
      success: true,
      googleSheetId: googleSheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`,
      message: "Onboarding complete: Google Sheet created and linked successfully",
    });

  } catch (error: any) {
    console.error("Auto-Onboarding Error:", error);
    
    // Handle specific Google OAuth errors
    if (error.code === 401) {
      return errorResponse("Invalid or expired Google access token", 401);
    }
    
    return errorResponse(error.message || "Internal Server Error", 500);
  }
}

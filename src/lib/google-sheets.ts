import { google } from "googleapis";

/**
 * Google Sheets Utility (Service Account based)
 * Handles sheet creation and reverse sharing.
 */
export async function createInstitutionSheet(tenantName: string, adminEmail: string) {
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  let credentials;
  if (serviceAccountVar) {
    credentials = JSON.parse(serviceAccountVar);
  } else if (serviceAccountEmail && privateKey) {
    credentials = {
      client_email: serviceAccountEmail,
      private_key: privateKey,
    };
  } else {
    console.warn("Google Google Service Account credentials missing.");
    throw new Error("গুগল সার্ভিস অ্যাকাউন্ট (Service Account) কনফিগার করা নেই। অনুগ্রহ করে .env ফাইল চেক করুন।");
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    // 1. Create the Spreadsheet
    const resource = {
       properties: {
         title: `MH_SaaS_${tenantName}`,
       },
    };

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: resource,
      fields: "spreadsheetId",
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error("Failed to create spreadsheet.");
    }

    // 2. Share the sheet with Admin Email (Reverse Sharing)
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: adminEmail,
      },
    });

    // 3. Optional: Initialize tabs (Attendance, Students, etc.)
    // For now, return the ID
    return spreadsheetId;

  } catch (error: any) {
    console.error("Google Sheets Error:", error);
    throw error;
  }
}

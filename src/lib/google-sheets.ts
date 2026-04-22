import { google } from "googleapis";

/**
 * Google Sheets Utility (Service Account based)
 * Handles sheet creation and reverse sharing.
 */
export async function createInstitutionSheet(tenantName: string, adminEmail: string) {
  const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  let clientEmail: string;
  let finalPrivateKey: string;

  if (serviceAccountVar) {
    const creds = JSON.parse(serviceAccountVar);
    clientEmail = creds.client_email;
    finalPrivateKey = creds.private_key;
  } else if (serviceAccountEmail && privateKey) {
    clientEmail = serviceAccountEmail;
    finalPrivateKey = privateKey;
  } else {
    console.warn("Google Service Account credentials missing.");
    throw new Error("গুগল সার্ভিস অ্যাকাউন্ট (Service Account) কনফিগার করা নেই। অনুগ্রহ করে .env ফাইল চেক করুন।");
  }

  try {
    // Robustly handle private key newlines for Vercel/Env var compatibility
    const cleanPrivateKey = finalPrivateKey.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      cleanPrivateKey,
      [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file"
      ]
    );

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    // 1. Create the Spreadsheet
    let spreadsheetId: string | undefined;
    try {
      const resource = {
         properties: {
           title: `MH_SaaS_${tenantName}`,
         },
      };

      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: resource,
        fields: "spreadsheetId",
      });

      spreadsheetId = spreadsheet.data.spreadsheetId ?? undefined;
    } catch (apiError: any) {
      console.error("Sheets API Error Detail:", JSON.stringify(apiError, null, 2));
      
      const isPermissionError = 
        apiError.code === 403 || 
        apiError.status === 403 ||
        JSON.stringify(apiError).toLowerCase().includes("permission") ||
        JSON.stringify(apiError).toLowerCase().includes("forbidden");

      if (isPermissionError) {
        throw new Error(
          "গুগল শীট এপিআই (Google Sheets API) আপনার গুগল ক্লাউড প্রজেক্টে এনাবল করা নেই অথবা সার্ভিস অ্যাকাউন্টের পর্যাপ্ত পারমিশন নেই। " +
          "অনুগ্রহ করে গুগল ক্লাউড কনসোল (console.cloud.google.com) থেকে 'Google Sheets API' এনাবল করুন এবং সার্ভিস অ্যাকাউন্টকে 'Editor' রোল দিন।"
        );
      }
      throw apiError;
    }

    if (!spreadsheetId) {
      throw new Error("গুগল শীট তৈরি করা সম্ভব হয়নি (ID missing)।");
    }

    // 2. Share the sheet with Admin Email (Reverse Sharing)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: adminEmail,
        },
      });
    } catch (shareError: any) {
      console.error("Drive API Sharing Error Detail:", JSON.stringify(shareError, null, 2));
      
      const isDrivePermissionError = 
        shareError.code === 403 || 
        shareError.status === 403 ||
        JSON.stringify(shareError).toLowerCase().includes("permission");

      if (isDrivePermissionError) {
        // We log this but don't strictly fail, as the sheet is created.
        // However, we should inform the user that sharing failed.
        console.warn("Google Drive API is likely not enabled. Sharing failed.");
      }
      // Note: We don't throw here to allow the process to proceed if the sheet was created
    }

    return spreadsheetId;

  } catch (error: any) {
    console.error("Google Sheets Error:", error);
    throw error;
  }
}

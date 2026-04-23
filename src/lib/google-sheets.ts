import { google } from "googleapis";

/**
 * Google Sheets Utility (Service Account based)
 * Handles sheet creation and reverse sharing.
 */
export async function createInstitutionSheet(tenantName: string, adminEmail: string) {
  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_ACCOUNT;
  
  if (!credentialsRaw) {
    console.warn("GOOGLE_CREDENTIALS_JSON environment variable is missing.");
    throw new Error("গুগল সার্ভিস অ্যাকাউন্ট (Service Account) কনফিগার করা নেই। অনুগ্রহ করে .env ফাইল চেক করুন।");
  }

  try {
    const credentials = JSON.parse(credentialsRaw);
    
    // Standardize private key just in case, though GoogleAuth is usually better at this
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key
        .replace(/\\n/g, '\n')
        .replace(/^"|"$/g, '')
        .trim();
    }

    console.log("Initializing Google Auth via JSON Credentials...");

    const auth = new google.auth.GoogleAuth({
      projectId: credentials.project_id,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ],
    });

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
      
      // Extract the most descriptive error message from Google
      const rawErrorMessage = apiError?.response?.data?.error?.message 
                           || apiError?.message 
                           || JSON.stringify(apiError);

      throw new Error(`Google API Raw Error: ${rawErrorMessage}`);
    }

    if (!spreadsheetId) {
      throw new Error("গুগল শীট তৈরি করা সম্ভব হয়নি (ID missing)।");
    }

    // 2. Share the sheet with Admin Email (Reverse Sharing)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: false, // Critical for Service Accounts without domain-wide delegation
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
        throw new Error(
          "গুগল ড্রাইভ এপিআই (Google Drive API) পারমিশন এরর। অনুগ্রহ করে গুগল ক্লাউড কনসোল থেকে " +
          "'Google Drive API' এনাবল করুন এবং আপনার সার্ভিস অ্যাকাউন্টকে 'Editor' রোল দিন।"
        );
      }
      throw shareError;
    }

    return spreadsheetId;

  } catch (error: any) {
    console.error("Google Sheets Error:", error);
    throw error;
  }
}

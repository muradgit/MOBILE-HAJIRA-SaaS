import { google } from "googleapis";

/**
 * Google Sheets Utility (Service Account based)
 * Uses "mobile-hajira-sheet-bot" service account for Drive/Sheets operations.
 * Fix: Proper private key parsing + sendNotificationEmail handling
 */
export async function createInstitutionSheet(
  tenantName: string,
  adminEmail: string
): Promise<string> {
  
  // 1. Parse credentials — supports both JSON string and separate env vars
  let clientEmail: string;
  let privateKey: string;

  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;

  if (credentialsRaw) {
    try {
      const credentials = JSON.parse(credentialsRaw);
      clientEmail = credentials.client_email;
      // Fix: Handle all possible newline escape formats from Vercel
      privateKey = credentials.private_key
        .replace(/\\\\n/g, "\n")  // quadruple escape
        .replace(/\\n/g, "\n")    // double escape
        .trim();
    } catch (e) {
      throw new Error(
        "GOOGLE_CREDENTIALS_JSON পার্স করা যায়নি। Vercel-এ valid JSON সেট করুন।"
      );
    }
  } else if (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  ) {
    clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    privateKey = process.env.GOOGLE_PRIVATE_KEY
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();
  } else {
    throw new Error(
      "Google Service Account credentials পাওয়া যায়নি। " +
      "GOOGLE_CREDENTIALS_JSON বা GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY সেট করুন।"
    );
  }

  // 2. Validate key format
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "Private key ফরম্যাট ভুল। Vercel-এ key সঠিকভাবে সেট করুন।"
    );
  }

  console.log(`[Sheets] Using service account: ${clientEmail}`);

  // 3. Initialize Google Auth with JWT
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  // 4. Verify auth works before proceeding
  try {
    await auth.authorize();
    console.log("[Sheets] Auth successful");
  } catch (authError: any) {
    throw new Error(
      `Service Account authentication ব্যর্থ: ${authError.message}. ` +
      "Private key বা email ভুল হতে পারে।"
    );
  }

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  // 5. Create the Spreadsheet inside the Shared Folder
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  let spreadsheetId: string;
  try {
    console.log(`Calling drive.files.create to create sheet inside folder: ${folderId}...`);
    const fileMetadata = {
      name: `MH_${tenantName}_${new Date().getFullYear()}`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId]
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    spreadsheetId = file.data.id!;
    console.log("Spreadsheet created with ID:", spreadsheetId);

    // Setup the 5 default tabs (A new sheet has "Sheet1" by default)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { updateSheetProperties: { properties: { sheetId: 0, title: "Attendance Log", index: 0 }, fields: "title,index" } },
          { addSheet: { properties: { title: "Students", index: 1 } } },
          { addSheet: { properties: { title: "Teachers", index: 2 } } },
          { addSheet: { properties: { title: "Settings", index: 3 } } },
          { addSheet: { properties: { title: "Payment History", index: 4 } } },
        ]
      }
    });

    console.log(`[Sheets] Tabs initialized for: ${spreadsheetId}`);
  } catch (apiError: any) {
    console.error("Sheets/Drive API Error Detail:", JSON.stringify(apiError, null, 2));
    const rawErrorMessage = apiError?.response?.data?.error?.message || apiError?.message || JSON.stringify(apiError);
    throw new Error(`Google API Raw Error: ${rawErrorMessage}`);
  }

  // 6. Share with admin — Fix: try with notification first, fallback without
  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      // Fix: sendNotificationEmail: true is more permissive; false can cause 403
      sendNotificationEmail: false,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: adminEmail,
      },
    });
    console.log(`[Sheets] Shared with ${adminEmail}`);
  } catch (shareErr: any) {
    const shareErrMsg = shareErr?.response?.data?.error?.message || shareErr?.message || "";
    console.warn(`[Sheets] Share without notification failed: ${shareErrMsg}`);

    // Fallback: try with email notification enabled
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: adminEmail,
        },
      });
      console.log(`[Sheets] Shared with notification to ${adminEmail}`);
    } catch (fallbackErr: any) {
      const fbMsg = fallbackErr?.response?.data?.error?.message || fallbackErr?.message || "";
      // Non-fatal: sheet exists even if sharing fails
      console.error(`[Sheets] Both share attempts failed: ${fbMsg}`);
      // Don't throw — return the sheet ID anyway so onboarding can continue
      // Admin can manually access via service account email
    }
  }

  // 7. Add header rows to Attendance Log sheet
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Attendance Log!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Date", "Teacher ID", "Student ID", "Student Name", "Class", "Status"]],
      },
    });
    console.log("[Sheets] Headers added to Attendance Log");
  } catch (headerErr) {
    console.warn("[Sheets] Could not add headers:", headerErr);
  }

  return spreadsheetId;
}
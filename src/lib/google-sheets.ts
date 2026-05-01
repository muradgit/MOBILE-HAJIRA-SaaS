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

  const sheets = google.sheets({ 
    version: "v4", 
    auth,
    params: { quotaUser: adminEmail } 
  });
  
  const drive = google.drive({ 
    version: "v3", 
    auth,
    params: { quotaUser: adminEmail }
  });

  // Helper for retry logic
  const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> => {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.response?.data?.error?.message || err?.message || "";
        const isQuotaError = errMsg.toLowerCase().includes("quota") || err?.response?.status === 403;
        
        if (isQuotaError && i < maxRetries) {
          const delay = Math.pow(2, i) * 1000;
          console.warn(`[Sheets] Quota/403 error. Retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }
    throw lastError;
  };

  // 5. Create the Spreadsheet inside the Shared Folder
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID environment variable is missing.");
  }

  let spreadsheetId: string;
  try {
    console.log(`Calling drive.files.create to create sheet inside folder: ${folderId} (quotaUser: ${adminEmail})...`);
    
    const fileMetadata = {
      name: `MH_${tenantName}_${new Date().getFullYear()}`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [folderId]
    };

    const file = await withRetry(() => drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
      supportsAllDrives: true,
    }));

    spreadsheetId = file.data.id!;
    console.log("Spreadsheet created with ID:", spreadsheetId);

    // Setup the 5 default tabs (A new sheet has "Sheet1" by default)
    await withRetry(() => sheets.spreadsheets.batchUpdate({
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
    }));

    console.log(`[Sheets] Tabs initialized for: ${spreadsheetId}`);
  } catch (apiError: any) {
    console.error("Sheets/Drive API Error Detail:", JSON.stringify(apiError, null, 2));
    const rawErrorMessage = apiError?.response?.data?.error?.message || apiError?.message || JSON.stringify(apiError);
    throw new Error(`Google API Raw Error (Quota/Permission): ${rawErrorMessage}`);
  }

  // 6. Share with admin ──────────────────────────────────────────────────────
  try {
    await withRetry(() => drive.permissions.create({
      fileId: spreadsheetId,
      sendNotificationEmail: false,
      supportsAllDrives: true,
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: adminEmail,
      },
    }));
    console.log(`[Sheets] Shared with ${adminEmail}`);
  } catch (shareErr: any) {
    const shareErrMsg = shareErr?.response?.data?.error?.message || shareErr?.message || "";
    console.warn(`[Sheets] Share without notification failed: ${shareErrMsg}`);

    // Fallback: try with email notification enabled
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        sendNotificationEmail: true,
        supportsAllDrives: true,
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
      range: "Attendance Log!A1:J1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Date", "Time", "Class ID", "Section", "Subject", "Teacher Name", "Total Present", "Total Absent", "Present Students", "Absent Students"]],
      },
    });
    console.log("[Sheets] Headers added to Attendance Log");
  } catch (headerErr) {
    console.warn("[Sheets] Could not add headers:", headerErr);
  }

  return spreadsheetId;
}

/**
 * Appends attendance records to the institution's Google Sheet
 * Called by QStash worker in the background
 */
/**
 * Syncs a teacher record to the "Teachers" tab
 */
export async function syncTeacherToSheet(tenantId: string, teacherData: any) {
  const { adminDb } = await import("@/src/lib/firebase-admin");
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  
  if (!tenantDoc.exists) throw new Error(`Institution not found: ${tenantId}`);
  
  const spreadsheetId = tenantDoc.data()?.googleSheetId;
  const adminEmail = tenantDoc.data()?.adminEmail || "hello@muradkhank31.com";
  if (!spreadsheetId) throw new Error("Google Sheet ID not configured");

  const auth = await getSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth, params: { quotaUser: adminEmail } });

  // Columns: ID, Name, Email, Role, Status, JoinedDate
  const values = [[
    teacherData.user_id || "N/A",
    teacherData.name || "N/A",
    teacherData.email || "N/A",
    teacherData.role || "teacher",
    teacherData.status || "approved",
    teacherData.created_at || new Date().toISOString()
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Teachers'!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/**
 * Syncs a student record to the "Students" tab
 */
export async function syncStudentToSheet(tenantId: string, studentData: any) {
  const { adminDb } = await import("@/src/lib/firebase-admin");
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  
  if (!tenantDoc.exists) throw new Error(`Institution not found: ${tenantId}`);
  
  const spreadsheetId = tenantDoc.data()?.googleSheetId;
  const adminEmail = tenantDoc.data()?.adminEmail || "hello@muradkhank31.com";
  if (!spreadsheetId) throw new Error("Google Sheet ID not configured");

  const auth = await getSheetsAuth();
  const sheets = google.sheets({ version: "v4", auth, params: { quotaUser: adminEmail } });

  // Columns: StudentID, Name, Email, Class, Section, Phone, Status
  const values = [[
    studentData.student_id || studentData.user_id || "N/A",
    studentData.name || "N/A",
    studentData.email || "N/A",
    studentData.class || "N/A",
    studentData.section || "N/A",
    studentData.phone || "N/A",
    studentData.status || "approved"
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Students'!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

/**
 * Shared Auth Helper
 */
async function getSheetsAuth() {
  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;
  let clientEmail: string;
  let privateKey: string;

  if (credentialsRaw) {
    const credentials = JSON.parse(credentialsRaw);
    clientEmail = credentials.client_email;
    privateKey = credentials.private_key
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();
  } else {
    clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    privateKey = (process.env.GOOGLE_PRIVATE_KEY || "")
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function appendAttendanceToSheet(tenantId: string, attendanceData: any) {
  // 1. Fetch the spreadsheetId for this tenant from Firebase
  const { adminDb } = await import("@/src/lib/firebase-admin");
  const tenantDoc = await adminDb.collection("tenants").doc(tenantId).get();
  
  if (!tenantDoc.exists) {
    throw new Error(`Institution with ID ${tenantId} not found in 'tenants' collection`);
  }
  
  const tenantData = tenantDoc.data();
  const spreadsheetId = tenantData?.googleSheetId;
  const adminEmail = tenantData?.adminEmail || "hello@muradkhank31.com";

  if (!spreadsheetId) {
    throw new Error(`Google Sheet ID not configured for institution: ${tenantId}`);
  }

  // 2. Initialize Auth
  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;
  let clientEmail: string;
  let privateKey: string;

  if (credentialsRaw) {
    try {
      const credentials = JSON.parse(credentialsRaw);
      clientEmail = credentials.client_email;
      privateKey = credentials.private_key
        .replace(/\\\\n/g, "\n")
        .replace(/\\n/g, "\n")
        .trim();
    } catch (e) {
      throw new Error("Failed to parse GOOGLE_CREDENTIALS_JSON");
    }
  } else {
    clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
    privateKey = (process.env.GOOGLE_PRIVATE_KEY || "")
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ 
    version: "v4", 
    auth,
    params: { quotaUser: adminEmail }
  });

  // 3. Format the row data
  const date = new Date().toLocaleDateString('en-GB');
  const time = new Date().toLocaleTimeString('en-GB');
  
  const values = [
    [
      date,
      time,
      attendanceData.classId || "N/A",
      attendanceData.section || "N/A",
      attendanceData.subject || "N/A",
      attendanceData.teacherName || "N/A",
      attendanceData.totalPresent || 0,
      attendanceData.totalAbsent || 0,
      Array.isArray(attendanceData.presentStudents) ? JSON.stringify(attendanceData.presentStudents) : (attendanceData.presentStudents || "[]"),
      Array.isArray(attendanceData.absentStudents) ? JSON.stringify(attendanceData.absentStudents) : (attendanceData.absentStudents || "[]")
    ]
  ];

  // 4. Append to "Attendance Log" tab
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Attendance Log'!A:J",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  console.log(`[Sheets] Appended summary attendance for tenant: ${tenantId}`);
}

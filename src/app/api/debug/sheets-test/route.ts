import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING
 * Tests each step of Google API access individually.
 * Visit: /api/debug/sheets-test
 */
export async function GET() {
  const results: Record<string, any> = {
    step1_env: null,
    step2_parse: null,
    step3_keyFormat: null,
    step4_auth: null,
    step5_driveList: null,
    step6_sheetsCreate: null,
  };

  // ── Step 1: Check environment variable ────────────────────────────────────
  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsRaw) {
    results.step1_env = {
      ok: false,
      error: "GOOGLE_CREDENTIALS_JSON environment variable is NOT set in Vercel",
    };
    return NextResponse.json({ success: false, results });
  }

  results.step1_env = {
    ok: true,
    length: credentialsRaw.length,
    startsWithBrace: credentialsRaw.trim().startsWith("{"),
  };

  // ── Step 2: Parse JSON ─────────────────────────────────────────────────────
  let credentials: any;
  try {
    credentials = JSON.parse(credentialsRaw);
    results.step2_parse = {
      ok: true,
      client_email: credentials.client_email,
      project_id: credentials.project_id,
      has_private_key: !!credentials.private_key,
      key_starts_with: credentials.private_key?.substring(0, 40),
    };
  } catch (e: any) {
    results.step2_parse = {
      ok: false,
      error: `JSON parse failed: ${e.message}`,
      hint: "Vercel-এ JSON paste করার সময় extra quotes বা newlines থাকলে এই error হয়",
    };
    return NextResponse.json({ success: false, results });
  }

  // ── Step 3: Private key format check ──────────────────────────────────────
  let privateKey = credentials.private_key;

  // Fix all escape variants
  privateKey = privateKey
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  const keyOk =
    privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
    privateKey.includes("-----END PRIVATE KEY-----");

  results.step3_keyFormat = {
    ok: keyOk,
    has_begin: privateKey.includes("-----BEGIN PRIVATE KEY-----"),
    has_end: privateKey.includes("-----END PRIVATE KEY-----"),
    newline_count: (privateKey.match(/\n/g) || []).length,
    error: keyOk ? null : "Private key ফরম্যাট ভুল — newline সঠিকভাবে parse হয়নি",
  };

  if (!keyOk) {
    return NextResponse.json({ success: false, results });
  }

  // ── Step 4: Authenticate with Google ──────────────────────────────────────
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  try {
    const token = await auth.authorize();
    results.step4_auth = {
      ok: true,
      token_type: token.token_type,
      expires: token.expiry_date,
      message: "Auth সফল — Service account valid",
    };
  } catch (authErr: any) {
    results.step4_auth = {
      ok: false,
      error: authErr.message,
      hint:
        authErr.message?.includes("invalid_grant")
          ? "Service account key expired বা revoked হয়ে গেছে — নতুন key generate করুন"
          : authErr.message?.includes("DECODER")
          ? "Private key format সমস্যা — newlines ঠিক নেই"
          : "Unknown auth error",
    };
    return NextResponse.json({ success: false, results });
  }

  // ── Step 5: Test Drive API (list files — minimal permission needed) ────────
  const drive = google.drive({ version: "v3", auth });
  try {
    const driveRes = await drive.files.list({
      pageSize: 1,
      fields: "files(id, name)",
    });
    results.step5_driveList = {
      ok: true,
      message: "Drive API accessible",
      file_count: driveRes.data.files?.length ?? 0,
    };
  } catch (driveErr: any) {
    const status = driveErr?.response?.status;
    results.step5_driveList = {
      ok: false,
      status,
      error: driveErr?.response?.data?.error?.message || driveErr.message,
      hint:
        status === 403
          ? "❌ Google Drive API আপনার Google Cloud Project-এ ENABLED নেই। Console → APIs & Services → Enable 'Google Drive API'"
          : status === 400
          ? "Drive API enabled আছে কিন্তু scope সমস্যা"
          : "অন্য সমস্যা",
    };
    // Continue to step 6 anyway to get Sheets-specific error
  }

  // ── Step 6: Test Sheets API create inside Folder ──────────────────────────
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const sheets = google.sheets({ version: "v4", auth });
  try {
    if (!folderId) {
       throw new Error("GOOGLE_DRIVE_FOLDER_ID is missing in environment");
    }

    const res = await drive.files.create({
      requestBody: {
        name: "DEBUG_TEST_FOLDER_DELETE_ME",
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId]
      },
      fields: "id",
    });

    results.step6_sheetsCreate = {
      ok: true,
      folderIdConfigured: folderId,
      spreadsheetId: res.data.id,
      message: "✅ Sheet successfully created inside the shared folder! এই entry টি manually delete করুন।",
    };

    return NextResponse.json({ success: true, results });
  } catch (sheetsErr: any) {
    const status = sheetsErr?.response?.status;
    const message =
      sheetsErr?.response?.data?.error?.message || sheetsErr.message;

    results.step6_sheetsCreate = {
      ok: false,
      folderIdConfigured: folderId || "MISSING",
      status,
      error: message,
      hint:
        status === 404
          ? "❌ Folder ID খুঁজে পাওয়া যায়নি। Folder টি Delete করা হয়েছে কি?"
          : status === 403
          ? "❌ 403 Forbidden — Service Account-এর Folder-এ Access নেই। Folder টি share করেছেন কি?"
          : "Unknown error",
    };

    return NextResponse.json({ success: false, results });
  }
}
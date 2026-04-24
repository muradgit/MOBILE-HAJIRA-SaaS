import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const credentialsRaw = process.env.GOOGLE_CREDENTIALS_JSON;
  
  if (!credentialsRaw) {
    return NextResponse.json({ error: "GOOGLE_CREDENTIALS_JSON not set" }, { status: 500 });
  }

  try {
    const credentials = JSON.parse(credentialsRaw);
    const privateKey = credentials.private_key
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .trim();

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    await auth.authorize();
    
    // Try creating a test sheet
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.create({
      requestBody: { properties: { title: "TEST_DELETE_ME" } },
      fields: "spreadsheetId",
    });

    return NextResponse.json({
      success: true,
      email: credentials.client_email,
      testSheetId: res.data.spreadsheetId,
      message: "Auth + Sheet creation সফল! Test sheet টি manually delete করুন।"
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      hint: "Private key format বা credentials ভুল"
    }, { status: 500 });
  }
}

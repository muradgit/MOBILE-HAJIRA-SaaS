import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { createInstitutionSheet } from "@/src/lib/google-sheets";
import { authenticate } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await authenticate(req);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = (decodedToken.role as string)?.toLowerCase().replace(/[\s-]/g, "_");
    if (callerRole !== "institute_admin" && callerRole !== "admin" && callerRole !== "institutionadmin" && callerRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tenantId, adminEmail } = await req.json();

    if (!tenantId || !adminEmail) {
      return NextResponse.json(
        { error: "tenantId এবং adminEmail আবশ্যক" },
        { status: 400 }
      );
    }

    // 1. Fetch tenant
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: "প্রতিষ্ঠান খুঁজে পাওয়া যায়নি" },
        { status: 404 }
      );
    }

    const tenantData = tenantDoc.data();

    // 2. Check if already set up
    if (tenantData?.googleSheetId) {
      return NextResponse.json({
        success: true,
        message: "সিস্টেম আগেই সেটআপ করা হয়েছে",
        googleSheetId: tenantData.googleSheetId,
        alreadySetup: true,
      });
    }

    const sheetName = tenantData?.name || tenantId;
    console.log(`[Onboarding] Starting setup for: ${sheetName} (${tenantId})`);

    // 3. Create Google Sheet
    let googleSheetId: string;
    try {
      googleSheetId = await createInstitutionSheet(sheetName, adminEmail);
    } catch (sheetError: any) {
      console.error("[Onboarding] Sheet creation error:", sheetError.message);
      return NextResponse.json(
        {
          error: sheetError.message,
          hint: "Vercel-এ GOOGLE_CREDENTIALS_JSON সঠিকভাবে সেট করা আছে কিনা চেক করুন",
        },
        { status: 500 }
      );
    }

    // 4. Update Firestore
    await tenantRef.update({
      googleSheetId,
      setupCompleted: true,
      setupAt: new Date().toISOString(),
    });

    console.log(`[Onboarding] Setup complete. Sheet: ${googleSheetId}`);

    return NextResponse.json({
      success: true,
      message: "সিস্টেম সফলভাবে সেটআপ হয়েছে!",
      googleSheetId,
    });

  } catch (error: any) {
    console.error("[Onboarding] Unexpected error:", error);
    return NextResponse.json(
      { error: `অপ্রত্যাশিত সমস্যা: ${error.message}` },
      { status: 500 }
    );
  }
}
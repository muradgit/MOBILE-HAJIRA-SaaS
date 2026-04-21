import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { createInstitutionSheet } from "@/src/lib/google-sheets";

/**
 * API Route: /api/onboarding/setup-sheet
 * Step 4.1: Master Logic for Google Sheet Onboarding (Reverse Sharing)
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, adminEmail } = await req.json();

    if (!tenantId || !adminEmail) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Get Tenant details for naming the sheet
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    const tenantDoc = await tenantRef.get();
    
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    const sheetName = tenantData?.name || tenantId;

    // 2. Create the Google Sheet and share it
    // Note: If credentials are missing, this will throw an error now instead of silent mock success.
    let googleSheetId: string;
    
    try {
      googleSheetId = await createInstitutionSheet(sheetName, adminEmail);
    } catch (sheetError: any) {
      console.error("Sheet Creation Failed:", sheetError);
      
      // Fallback for demo: If service account is NOT configured, we might still want to allow proceeding in AI Studio
      // but the user's specific complaint is that nothing happened.
      // I will return a 500 error if it fails so the user knows WHY.
      return NextResponse.json({ 
        error: `গুগল শীট তৈরি করা সম্ভব হয়নি। কারিগরি সমস্যা: ${sheetError.message}` 
      }, { status: 500 });
    }

    // 3. Update the `tenants/{tenantId}` document in Firestore
    await tenantRef.update({
      googleSheetId: googleSheetId,
      setupCompleted: true,
      updated_at: new Date().toISOString()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "System setup completed successfully",
      googleSheetId: googleSheetId 
    });

  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

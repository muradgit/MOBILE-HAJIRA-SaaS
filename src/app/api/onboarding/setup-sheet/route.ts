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
    console.log("Onboarding Start - Tenant ID:", tenantId);
    let tenantRef;
    let tenantDoc;
    try {
      tenantRef = adminDb.collection("tenants").doc(tenantId);
      tenantDoc = await tenantRef.get();
    } catch (dbError: any) {
      console.error("Firestore Get Error:", dbError);
      return NextResponse.json({ error: `ডাটাবেজ কানেক্ট করা সম্ভব হয়নি: ${dbError.message}` }, { status: 500 });
    }
    
    if (!tenantDoc.exists) {
      console.warn("Tenant not found:", tenantId);
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }

    const tenantData = tenantDoc.data();
    const sheetName = tenantData?.name || tenantId;
    console.log("Creating Sheet for:", sheetName);

    // 2. Create the Google Sheet and share it
    let googleSheetId: string;
    
    try {
      googleSheetId = await createInstitutionSheet(sheetName, adminEmail);
      console.log("Sheet Created:", googleSheetId);
    } catch (sheetError: any) {
      console.error("Sheet Creation Failed:", sheetError);
      return NextResponse.json({ 
        error: `গুগল শীট তৈরি করা সম্ভব হয়নি। কারিগরি সমস্যা: ${sheetError.message}` 
      }, { status: 500 });
    }

    // 3. Update the `tenants/{tenantId}` document in Firestore
    try {
      await tenantRef.update({
        googleSheetId: googleSheetId,
        setupCompleted: true,
        updated_at: new Date().toISOString()
      });
      console.log("Firestore Updated Successfully");
    } catch (updateError: any) {
      console.error("Firestore Update Error:", updateError);
      return NextResponse.json({ error: `ডাটা আপডেট করা সম্ভব হয়নি: ${updateError.message}` }, { status: 500 });
    }
    
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

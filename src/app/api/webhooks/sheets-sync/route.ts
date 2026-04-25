import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { appendAttendanceToSheet } from "@/src/lib/google-sheets";

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, data, type } = body;

    console.log(`[QStash Worker] Processing ${type} sync for tenant: ${tenantId}`);

    if (type === "ATTENDANCE") {
      // Assuming appendAttendanceToSheet is exported from google-sheets
      // and it handles finding the spreadsheet ID from the tenantId
      await appendAttendanceToSheet(tenantId, data);
    } else if (type === "PAYMENT") {
      // Handle payment sync if needed
      console.log(`[QStash Worker] Payment sync not yet implemented for: ${tenantId}`);
    }

    return NextResponse.json({ success: true, message: `Processed ${type} sync` });
  } catch (error: any) {
    console.error("[QStash Worker] Error:", error);
    // Returning 500 tells QStash to RETRY this job later
    const status = error.code === 403 || error.code === 429 ? 500 : 400;
    return NextResponse.json(
      { error: error.message || "Unknown error during sync" }, 
      { status }
    );
  }
}

// Export the handler wrapped with signature verification
export const POST = verifySignatureAppRouter(handler);

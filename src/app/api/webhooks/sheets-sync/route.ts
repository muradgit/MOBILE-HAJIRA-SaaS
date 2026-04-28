import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { 
  appendAttendanceToSheet, 
  syncTeacherToSheet, 
  syncStudentToSheet 
} from "@/src/lib/google-sheets";

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, data, type } = body;

    console.log(`[QStash Worker] Processing ${type} sync for tenant: ${tenantId}`);

    if (type === "ATTENDANCE") {
      await appendAttendanceToSheet(tenantId, data);
    } else if (type === "TEACHER") {
      await syncTeacherToSheet(tenantId, data);
    } else if (type === "STUDENT") {
      await syncStudentToSheet(tenantId, data);
    } else if (type === "PAYMENT") {
      console.log(`[QStash Worker] Payment sync not yet implemented for: ${tenantId}`);
    }

    return NextResponse.json({ success: true, message: `Processed ${type} sync` });
  } catch (error: any) {
    console.error(`[QStash Worker] Error processing ${req.body ? "body" : "unknown"}:`, error);
    // Returning 500 tells QStash to RETRY this job later
    const status = error.code === 403 || error.code === 429 ? 500 : 400;
    return NextResponse.json(
      { error: error.message || "Unknown error during sync" }, 
      { status: 500 } // Always return 500 for retry in case of transient sheet errors
    );
  }
}

// Export the handler wrapped with signature verification
export const POST = verifySignatureAppRouter(handler);

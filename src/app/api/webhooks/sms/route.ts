import { NextRequest } from "next/server";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { errorResponse, successResponse } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return errorResponse("Unauthorized", 401);
  }

  const body = await req.json();
  const { sms } = body;
  if (!sms) return errorResponse("No SMS content");

  const trxRegex = /TrxID\s?([A-Z0-9]+)/i;
  const amountRegex = /Tk\s?([0-9,.]+)/i;

  const trxMatch = sms.match(trxRegex);
  const amountMatch = sms.match(amountRegex);

  if (trxMatch && amountMatch) {
    const trx_id = trxMatch[1].toUpperCase();
    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

    try {
      await adminDb.collection("transactions").doc(trx_id).set({
        trx_id,
        amount,
        status: "unused",
        timestamp: admin.firestore.Timestamp.now()
      }, { merge: true });
      return successResponse({ success: true });
    } catch (error) {
      return errorResponse("Failed to save transaction", 500);
    }
  } else {
    return errorResponse("Could not parse SMS");
  }
}

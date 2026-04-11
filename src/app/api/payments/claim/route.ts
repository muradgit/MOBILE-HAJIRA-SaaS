import { NextRequest } from "next/server";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { trx_id, tenant_id } = body;
  if (!trx_id || !tenant_id) return errorResponse("Missing fields");

  try {
    const trxRef = adminDb.collection("transactions").doc(trx_id);
    const tenantRef = adminDb.collection("tenants").doc(tenant_id);

    const result = await adminDb.runTransaction(async (transaction) => {
      const trxDoc = await transaction.get(trxRef);
      if (!trxDoc.exists || trxDoc.data()?.status !== "unused") {
        throw new Error("Invalid or already used TrxID");
      }

      const amount = trxDoc.data()?.amount || 0;
      let credits = amount;
      if (amount >= 500) credits += amount * 0.1;

      transaction.update(trxRef, { status: "used", claimed_by_tenant: tenant_id });
      transaction.update(tenantRef, {
        credits_left: admin.firestore.FieldValue.increment(credits)
      });

      return { credits };
    });

    return successResponse({ success: true, creditsAdded: result.credits });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

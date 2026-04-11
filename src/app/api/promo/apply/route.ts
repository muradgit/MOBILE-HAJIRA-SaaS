import { NextRequest } from "next/server";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { promo_code, tenant_id } = body;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const tenantRef = adminDb.collection("tenants").doc(tenant_id);
      const tenantDoc = await transaction.get(tenantRef);
      const tenantData = tenantDoc.data();

      if (tenantData?.promo_code === promo_code) throw new Error("Cannot use own code");

      const referrerQuery = await adminDb.collection("tenants").where("promo_code", "==", promo_code).limit(1).get();
      if (referrerQuery.empty) throw new Error("Invalid promo code");

      const referrerDoc = referrerQuery.docs[0];
      const referrerData = referrerDoc.data();

      if (referrerData.referral_count >= 5) throw new Error("Promo code limit reached");

      transaction.update(tenantRef, { credits_left: admin.firestore.FieldValue.increment(20) });
      transaction.update(referrerDoc.ref, { 
        credits_left: admin.firestore.FieldValue.increment(20),
        referral_count: admin.firestore.FieldValue.increment(1)
      });
    });
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

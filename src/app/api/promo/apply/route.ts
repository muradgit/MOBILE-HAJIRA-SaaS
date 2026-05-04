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
      const currentTenantCredits = tenantData?.credits ?? tenantData?.credits_left ?? 0;

      if (tenantData?.promo_code === promo_code) throw new Error("Cannot use own code");

      const referrerQuery = await adminDb.collection("tenants").where("promo_code", "==", promo_code).limit(1).get();
      if (referrerQuery.empty) throw new Error("Invalid promo code");

      const referrerDoc = referrerQuery.docs[0];
      const referrerData = referrerDoc.data();
      const currentReferrerCredits = referrerData.credits ?? referrerData.credits_left ?? 0;

      if (referrerData.referral_count >= 5) throw new Error("Promo code limit reached");

      // Update Applicant
      transaction.update(tenantRef, { 
        credits: admin.firestore.FieldValue.increment(20),
        credits_left: admin.firestore.FieldValue.increment(20),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const historyApplicantRef = tenantRef.collection("credit_history").doc();
      transaction.set(historyApplicantRef, {
        amount: 20,
        type: "bonus",
        description: `Promo Code Applied: ${promo_code}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        previous_balance: currentTenantCredits,
        new_balance: currentTenantCredits + 20
      });

      // Update Referrer
      transaction.update(referrerDoc.ref, { 
        credits: admin.firestore.FieldValue.increment(20),
        credits_left: admin.firestore.FieldValue.increment(20),
        referral_count: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const historyReferrerRef = referrerDoc.ref.collection("credit_history").doc();
      transaction.set(historyReferrerRef, {
        amount: 20,
        type: "bonus",
        description: `Referral Success: New organization joined`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        previous_balance: currentReferrerCredits,
        new_balance: currentReferrerCredits + 20
      });
    });
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

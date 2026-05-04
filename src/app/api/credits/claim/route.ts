import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/src/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { MacrodroidPayment, CreditHistory, Tenant } from "@/src/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { transactionId, tenantId, userId } = await req.json();

    if (!transactionId || !tenantId) {
      return NextResponse.json({ success: false, error: "ট্রানজেকশন আইডি এবং টেন্যান্ট আইডি প্রয়োজন।" }, { status: 400 });
    }

    // 1. Check if payment exists in macrodroid_payments
    // We use a transaction to ensure atomicity
    const result = await adminDb.runTransaction(async (transaction) => {
      const paymentRef = adminDb.collection("macrodroid_payments").where("trx_id", "==", transactionId).limit(1);
      const paymentSnap = await transaction.get(paymentRef);

      if (paymentSnap.empty) {
        throw new Error("ভুল ট্রানজেকশন আইডি! অনুগ্রহ করে সঠিক আইডি দিয়ে আবার চেষ্টা করুন।");
      }

      const paymentDoc = paymentSnap.docs[0];
      const paymentData = paymentDoc.data() as MacrodroidPayment;

      if (paymentData.status === "used") {
        throw new Error("এই ট্রানজেকশন আইডি ইতিপূর্বে ব্যবহার করা হয়েছে।");
      }

      // 2. Load Tenant to get current balance
      const tenantRef = adminDb.collection("tenants").doc(tenantId);
      const tenantSnap = await transaction.get(tenantRef);
      
      if (!tenantSnap.exists) {
        throw new Error("প্রতিষ্ঠান খুঁজে পাওয়া যায়নি।");
      }

      const tenantData = tenantSnap.data() as Tenant;
      const currentCredits = tenantData.credits_left || 0;
      const rechargeAmount = paymentData.amount; // 1 Taka = 1 Credit
      const newCredits = currentCredits + rechargeAmount;

      // 3. Mark payment as used
      transaction.update(paymentDoc.ref, {
        status: "used",
        claimed_by: tenantId,
        claimed_at: FieldValue.serverTimestamp()
      });

      // 4. Update tenant credits
      transaction.update(tenantRef, {
        credits_left: newCredits,
        updatedAt: FieldValue.serverTimestamp(),
        last_recharge_date: new Date().toISOString()
      });

      // 5. Log Credit History
      const historyRef = tenantRef.collection("credit_history").doc();
      transaction.set(historyRef, {
        tenant_id: tenantId,
        amount: rechargeAmount,
        type: "purchase",
        description: `Credit Recharge via bKash (TrxID: ${transactionId})`,
        timestamp: FieldValue.serverTimestamp(),
        previous_balance: currentCredits,
        new_balance: newCredits,
        reference_id: transactionId
      });

      return { newCredits, rechargeAmount };
    });

    return NextResponse.json({ 
      success: true, 
      message: `${result.rechargeAmount} ক্রেডিট সফলভাবে যোগ করা হয়েছে!`,
      newCredits: result.newCredits
    });

  } catch (error: any) {
    console.error("Credit Claim Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

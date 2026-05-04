import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Deducts credits from a tenant and logs the transaction.
 * @param tenantId The unique ID of the institute
 * @param amount Number of credits to deduct (default 2 for attendance)
 * @param description Reason for deduction
 * @returns { success: boolean, message: string, remainingCredits?: number }
 */
export async function deductCredits(tenantId: string, amount: number = 2, description: string = "Attendance Submission") {
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  
  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const tenantDoc = await transaction.get(tenantRef);
      
      if (!tenantDoc.exists) {
        throw new Error("প্রতিষ্ঠানটি খুঁজে পাওয়া যায়নি।");
      }

      const tenantData = tenantDoc.data();
      // Supporting both 'credits' and 'credits_left' for backward compatibility during transition
      const currentCredits = tenantData?.credits ?? tenantData?.credits_left ?? 0;

      if (currentCredits < amount) {
        return { 
          success: false, 
          message: "পর্যাপ্ত ক্রেডিট নেই। অনুগ্রহ করে রিচার্জ করুন।",
          remainingCredits: currentCredits 
        };
      }

      // Deduct Credits - standardized to 'credits' field
      transaction.update(tenantRef, {
        credits: FieldValue.increment(-amount),
        credits_left: FieldValue.increment(-amount), // Keep both updated for now
        updatedAt: FieldValue.serverTimestamp()
      });

      // Log History
      const historyRef = tenantRef.collection("credit_history").doc();
      transaction.set(historyRef, {
        amount: -amount,
        type: "deduction",
        description,
        timestamp: FieldValue.serverTimestamp(),
        previous_balance: currentCredits,
        new_balance: currentCredits - amount
      });

      return { 
        success: true, 
        message: "ক্রেডিট সফলভাবে কাটা হয়েছে।",
        remainingCredits: currentCredits - amount 
      };
    });

    return result;
  } catch (error: any) {
    console.error("Credit deduction error:", error);
    return { success: false, message: error.message || "ক্রেডিট সিস্টেমে সমস্যা হয়েছে।" };
  }
}

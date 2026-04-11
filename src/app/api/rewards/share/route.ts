import { NextRequest } from "next/server";
import { adminDb, admin } from "@/src/lib/firebase-admin";
import { authenticate, errorResponse, successResponse } from "@/src/lib/api-utils";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const { tenant_id } = body;
  
  const nowDhaka = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
  const dateStr = new Date(nowDhaka).toISOString().split("T")[0];

  try {
    const rewardRef = adminDb.collection("tenants").doc(tenant_id).collection("rewards").doc(dateStr);
    const tenantRef = adminDb.collection("tenants").doc(tenant_id);

    await adminDb.runTransaction(async (transaction) => {
      const rewardDoc = await transaction.get(rewardRef);
      if (rewardDoc.exists && rewardDoc.data()?.claimed) {
        throw new Error("Already claimed for today");
      }

      transaction.set(rewardRef, { tenant_id, date: dateStr, claimed: true });
      transaction.update(tenantRef, { credits_left: admin.firestore.FieldValue.increment(1) });
    });

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

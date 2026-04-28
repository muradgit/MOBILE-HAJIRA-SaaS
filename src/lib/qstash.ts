import { Client } from "@upstash/qstash";

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

/**
 * Helper function to push sync jobs to the queue
 */
export async function queueGoogleSheetSync(
  tenantId: string, 
  data: any, 
  type: "ATTENDANCE" | "PAYMENT" | "TEACHER" | "STUDENT"
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mobile-hajira-saas.vercel.app";
  
  try {
    const res = await qstashClient.publishJSON({
      url: `${baseUrl}/api/webhooks/sheets-sync`,
      body: { tenantId, data, type },
      // Optional: Add a delay or deduplication ID if needed
    });
    
    console.log(`[QStash] Job queued: ${res.messageId}`);
    return res;
  } catch (error) {
    console.error("[QStash] Failed to queue job:", error);
    // We don't throw here to avoid failing the main request if queuing fails
    return null;
  }
}

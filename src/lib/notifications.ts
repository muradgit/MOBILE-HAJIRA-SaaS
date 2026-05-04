export async function triggerNotification(params: {
  userId: string;
  title: string;
  body: string;
  type?: string;
  link?: string;
  data?: any;
}) {
  try {
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to trigger notification:", error);
    return { success: false, error: "Network error" };
  }
}

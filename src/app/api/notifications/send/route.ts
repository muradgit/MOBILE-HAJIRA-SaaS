import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/src/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, type, link, data } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Save to Firestore
    const notificationRef = adminDb.collection("notifications").doc();
    const notificationData = {
      id: notificationRef.id,
      user_id: userId,
      title,
      body,
      type: type || "general",
      status: "unread",
      link: link || "/",
      createdAt: new Date().toISOString(),
      ...data
    };
    await notificationRef.set(notificationData);

    // 2. Get User's FCM Token
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken) {
      // 3. Send via FCM
      await adminMessaging.send({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          url: link || "/",
          type: type || "general"
        }
      });
    }

    return NextResponse.json({ success: true, notificationId: notificationRef.id });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

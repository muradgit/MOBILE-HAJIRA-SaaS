import { useState, useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "@/src/lib/firebase";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useUserStore } from "@/src/store/useUserStore";
import { toast } from "sonner";

export function useNotifications() {
  const { userData } = useUserStore();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  // Sync unread count
  useEffect(() => {
    if (!userData) return;
    
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userData.user_id),
      where("status", "==", "unread")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });
    
    return () => unsubscribe();
  }, [userData]);

  const requestPermission = async () => {
    if (!userData) return;
    
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      
      if (status === "granted") {
        const msg = await messaging();
        if (msg) {
          const token = await getToken(msg, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
          });
          
          if (token) {
            // Save token to user profile
            const userRef = doc(db, "users", userData.user_id);
            await updateDoc(userRef, { fcmToken: token });
            console.log("FCM Token saved:", token);
          }
        }
      }
    } catch (error) {
      console.error("Error getting notification permission:", error);
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    let unsubscribe: () => void;
    
    const setupListener = async () => {
      const msg = await messaging();
      if (msg) {
        unsubscribe = onMessage(msg, (payload) => {
          console.log("Foreground message received:", payload);
          toast.info(payload.notification?.title || "Notification", {
            description: payload.notification?.body,
            action: {
              label: "View",
              onClick: () => {
                if (payload.data?.url) {
                  window.location.href = payload.data.url;
                }
              }
            }
          });
        });
      }
    };

    setupListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    permission,
    requestPermission,
    unreadCount
  };
}

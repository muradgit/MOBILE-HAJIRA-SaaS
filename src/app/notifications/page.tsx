'use client';

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, updateDoc, doc, limit } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useUserStore } from "@/src/store/useUserStore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  MessageSquare,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  status: 'unread' | 'read';
  link: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { userData } = useUserStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) {
      router.push("/login");
      return;
    }
    fetchNotifications();
  }, [userData]);

  const fetchNotifications = async () => {
    if (!userData) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("user_id", "==", userData.user_id),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(list);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string, link?: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { status: "read" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "read" } : n));
      if (link) router.push(link);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.status === "unread");
    if (unread.length === 0) return;
    
    try {
      await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { status: "read" })));
      setNotifications(prev => prev.map(n => ({ ...n, status: "read" })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'attendance': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'alert': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-black text-gray-900 font-bengali">নোটিফিকেশন সেন্টার</h1>
          </div>
          <button 
            onClick={markAllAsRead}
            className="text-[10px] font-black uppercase tracking-widest text-[#6f42c1] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors"
          >
            সবগুলো পঠিত মার্ক করুন
          </button>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-gray-400 font-bengali">লোড হচ্ছে...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400 mb-6">
              <Bell className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2 font-bengali">কোনো নোটিফিকেশন নেই</h3>
            <p className="text-sm font-bold text-gray-400 max-w-[240px] font-bengali">
              আপনার কাছে নতুন কোনো নোটিফিকেশন আসলে এখানে দেখা যাবে।
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => markAsRead(notification.id, notification.link)}
                  className={cn(
                    "bg-white border rounded-[2rem] p-5 flex gap-4 cursor-pointer transition-all active:scale-[0.98]",
                    notification.status === 'unread' ? "border-purple-200 bg-purple-50/30" : "border-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    notification.status === 'unread' ? "bg-white shadow-sm" : "bg-gray-50"
                  )}>
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-black text-sm text-gray-900 truncate font-bengali">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: bn })}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-500 line-clamp-2 leading-relaxed font-bengali">
                      {notification.body}
                    </p>
                  </div>

                  <div className="flex items-center justify-center shrink-0">
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

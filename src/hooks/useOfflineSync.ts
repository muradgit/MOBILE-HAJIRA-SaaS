"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { auth } from "@/src/lib/firebase";

interface AttendanceQueueItem {
  id: string;
  payload: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [queue, setQueue] = useState<AttendanceQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue from localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem("attendance_sync_queue");
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error("Failed to parse attendance queue", e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("attendance_sync_queue", JSON.stringify(queue));
  }, [queue]);

  const addToQueue = useCallback((payload: any) => {
    const newItem: AttendanceQueueItem = {
      id: crypto.randomUUID(),
      payload,
      timestamp: Date.now(),
    };
    setQueue((prev) => [...prev, newItem]);
    toast.success("অফলাইন মোডে হাজিরা সেভ করা হয়েছে। ইন্টারনেট আসলে অটো-সিঙ্ক হবে।", {
      description: "Attendance saved locally while offline.",
      duration: 5000,
    });
  }, []);

  const syncQueue = useCallback(async () => {
    if (queue.length === 0 || isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    const toastId = toast.loading(`${queue.length} টি পেন্ডিং হাজিরা সিঙ্ক হচ্ছে...`);

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setIsSyncing(false);
      toast.dismiss(toastId);
      return;
    }

    const itemsToProcess = [...queue];
    let successCount = 0;
    const remainingQueue: AttendanceQueueItem[] = [];

    for (const item of itemsToProcess) {
      try {
        const res = await fetch("/api/attendance/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          // If it's a validation error, we might want to discard or keep it.
          // For now, keep it in queue if failed.
          remainingQueue.push(item);
        }
      } catch (error) {
        remainingQueue.push(item);
      }
    }

    setQueue(remainingQueue);
    setIsSyncing(false);
    toast.dismiss(toastId);

    if (successCount > 0) {
      toast.success(`${successCount} টি হাজিরা সফলভাবে সিঙ্ক হয়েছে!`);
    }
    
    if (remainingQueue.length > 0) {
      toast.error(`${remainingQueue.length} টি হাজিরা সিঙ্ক হতে পারেনি।`);
    }
  }, [queue, isSyncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return {
    queue,
    addToQueue,
    syncQueue,
    isSyncing,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  };
}

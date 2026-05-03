"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { 
  Loader2, 
  Zap, 
  Database
} from "lucide-react";
import { Tenant } from "@/src/lib/types";

import { useUserStore } from "@/src/store/useUserStore";

/**
 * Institute Admin Onboarding Page
 * Specifically for setting up the Google Sheet backup.
 */
export default function OnboardingPage() {
  const { userData, loading: authLoading, tenant } = useAuth();
  const { user, setUser } = useUserStore();
  const router = useRouter();
  const [onboarding, setOnboarding] = useState(false);

  // If already has googleSheetId, redirect to dashboard
  useEffect(() => {
    if (!authLoading && tenant?.googleSheetId) {
      router.replace("/admin/dashboard");
    }
  }, [authLoading, tenant, router]);

  const handleSetupSystem = async () => {
    if (!userData?.tenant_id || !userData?.email) return;
    
    setOnboarding(true);
    const toastId = toast.loading("সিস্টেম সেটআপ হচ্ছে... গুগল শীট তৈরি করা হচ্ছে।");
    
    try {
      const response = await fetch("/api/onboarding/setup-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tenantId: userData.tenant_id, 
          adminEmail: userData.email 
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Manually update store to prevent hydration/stale data issues in dashboard
        if (user) {
          setUser({ ...user, googleSheetId: result.googleSheetId });
        }
        
        toast.success("অভিনন্দন! আপনার সিস্টেম এখন প্রস্তুত।", { id: toastId });
        
        // Force refresh server components cache
        router.refresh();
        
        // Use a slight delay to ensure store and cache are synced
        setTimeout(() => {
          router.push("/admin/settings");
        }, 100);
      } else {
        throw new Error(result.error || "সেটআপ ব্যর্থ হয়েছে");
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setOnboarding(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-500 bg-white p-12 rounded-[3rem] shadow-2xl shadow-purple-500/5 border border-purple-50">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-purple-100 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-purple-500/10">
            <Zap className="w-12 h-12 text-[#6f42c1]" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 font-bengali tracking-tight">
            হ্যালো "{userData?.nameBN || userData?.name}", স্বাগতম।
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed font-bengali font-medium">
            এটেনডেন্স সিস্টেম সেটআপ শুরু করার জন্য নিন্মের বাটনে ক্লিক করুন। এতে নতুন একটি গুগল শীট তৈরি হবে যাতে সকল তথ্য ব্যাকআপ হিসেবে থাকবে। এই শীটটি আপনার ড্রাইভে শেয়ার করা থাকবে।
          </p>
        </div>

        <button 
          onClick={handleSetupSystem}
          disabled={onboarding}
          className="w-full sm:w-auto bg-[#6f42c1] text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
        >
          {onboarding ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6" />
              <span>Create Backup Sheet</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

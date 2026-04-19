"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { db } from "@/src/lib/firebase";
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc
} from "firebase/firestore";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Loader2, 
  ShieldAlert, 
  Zap, 
  Users, 
  GraduationCap, 
  ExternalLink, 
  Copy, 
  Share2, 
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Tenant, UserData } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Institute Admin Dashboard & Onboarding
 * Fixed version with robust error-handling, fallback tenant lookup, and hydration safety.
 */
export default function AdminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId: storeTenantId } = useUserStore();
  
  // States
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState({ teachers: 0, students: 0 });
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // 1. Hydration-Safe Origin Detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // 2. Tenant ID Fallback Strategy
  useEffect(() => {
    const resolveTenantId = async () => {
      // Priority 1: Zustand Store
      if (storeTenantId) {
        setActiveTenantId(storeTenantId);
        return;
      }

      // Priority 2: useAuth userData (already in memory)
      if (userData?.tenant_id) {
        setActiveTenantId(userData.tenant_id);
        return;
      }

      // Priority 3: Deep check Firestore if store or auth is lagging
      if (userData?.user_id) {
        try {
          const userDoc = await getDoc(doc(db, "users", userData.user_id));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (data.tenant_id) {
              setActiveTenantId(data.tenant_id);
            }
          }
        } catch (err) {
          console.error("Fallback tenant lookup failed:", err);
        }
      }
    };

    if (!authLoading) {
      resolveTenantId();
    }
  }, [storeTenantId, userData, authLoading]);

  // 3. Real-time Data Listeners & Stats
  useEffect(() => {
    if (!activeTenantId) return;

    let unsubTenant = () => {};

    const startListeners = async () => {
      try {
        // Tenant Real-time listener
        unsubTenant = onSnapshot(doc(db, "tenants", activeTenantId), (snap) => {
          if (snap.exists()) {
            setTenant(snap.data() as Tenant);
          }
          // Only stop loading if we haven't hit a critical error yet
          setLoading(false);
        });

        // 4. Fetch Stats with Robust Error Handling for Missing Indexes
        const usersRef = collection(db, "users");
        const teacherQ = query(usersRef, where("tenant_id", "==", activeTenantId), where("role", "==", "Teacher"));
        const studentQ = query(usersRef, where("tenant_id", "==", activeTenantId), where("role", "==", "Student"));
        
        try {
          const [tSnap, sSnap] = await Promise.all([getDocs(teacherQ), getDocs(studentQ)]);
          setStats({
            teachers: tSnap.size,
            students: sSnap.size
          });
          setErrorStatus(null);
        } catch (err: any) {
          console.error("Firestore Index Error:", err);
          if (err?.message?.includes("index")) {
            setErrorStatus("ডাটাবেজ ইনডেক্স তৈরি করা নেই। দয়া করে ক্যাশ/কনসোল চেক করুন।");
          }
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    startListeners();
    return () => unsubTenant();
  }, [activeTenantId]);

  // Handle Onboarding Setup
  const handleSetupSystem = async () => {
    if (!activeTenantId || !userData?.email) return;
    
    setOnboarding(true);
    const toastId = toast.loading("সিস্টেম সেটআপ হচ্ছে... গুগল শীট তৈরি করা হচ্ছে।");
    
    try {
      const response = await fetch("/api/onboarding/setup-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tenantId: activeTenantId, 
          adminEmail: userData.email 
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success("অভিনন্দন! আপনার সিস্টেম এখন প্রস্তুত।", { id: toastId });
      } else {
        throw new Error(result.error || "সেটআপ ব্যর্থ হয়েছে");
      }
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setOnboarding(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${origin}/register?ref=${activeTenantId}`;
    navigator.clipboard.writeText(link);
    toast.success("লিংকটি কপি করা হয়েছে!");
  };

  // Auth & Loading Overlay
  if (authLoading || (loading && !activeTenantId)) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">লোড হচ্ছে...</p>
      </div>
    </div>
  );

  const isAuthorized = userData?.role === "InstitutionAdmin" || userData?.role === "SuperAdmin";
  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <ShieldAlert className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-black text-gray-900 font-bengali">অ্যাক্সেস ডিনাইড</h2>
      <p className="text-gray-500">এই ড্যাশবোর্ডটি দেখার অনুমতি আপনার নেই।</p>
    </div>
  );

  // Onboarding Phase
  if (!tenant?.googleSheetId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6 border-purple-100 shadow-2xl shadow-purple-500/10">
          <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
            <Zap className="w-10 h-10 text-[#6f42c1]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 font-bengali">সাগরিকা স্বাগতম!</h2>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">
              আপনার প্রতিষ্ঠানের হাজিরা সিস্টেম চালু করতে এবং ডাটা ব্যাকআপের জন্য আমাদের একটি গুগল শীট তৈরি করতে হবে।
            </p>
          </div>
          
          <button 
            onClick={handleSetupSystem}
            disabled={onboarding}
            className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {onboarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            সিস্টেম সেটআপ করুন
          </button>
          
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            * এটি অটোমেটিক আপনার ইমেইলে শেয়ার করা হবে
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
            <LayoutDashboard className="w-7 h-7 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali tracking-tight">{tenant.nameBN || tenant.name}</h1>
            <p className="text-sm text-gray-500 font-medium">ইনস্টিটিউট অ্যাডমিন ড্যাশবোর্ড</p>
          </div>
        </div>

        <div className="flex gap-2">
           <a 
            href={`https://docs.google.com/spreadsheets/d/${tenant.googleSheetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-emerald-600 shadow-sm hover:bg-emerald-50 transition-all group"
          >
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
            গুগল শীট
          </a>
        </div>
      </div>

      {/* Index Error Display */}
      {errorStatus && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">
            {errorStatus}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 border-transparent bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">বর্তমান ক্রেডিট</p>
              <Zap className="w-5 h-5 opacity-60" />
            </div>
            <div className="flex items-end justify-between gap-4">
              <h3 className="text-4xl font-black">{tenant.credits_left}</h3>
              <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                রিচার্জ করুন
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-purple-200 transition-all border-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">মোট শিক্ষক</p>
          <h3 className="text-3xl font-black text-gray-900">{stats.teachers}</h3>
        </Card>

        <Card className="p-6 hover:border-purple-200 transition-all border-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-orange-600" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">মোট শিক্ষার্থী</p>
          <h3 className="text-3xl font-black text-gray-900">{stats.students}</h3>
        </Card>
      </div>

      {/* Referral Section */}
      <Card className="overflow-hidden border-purple-100 bg-purple-50/30">
        <div className="px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Share2 className="w-5 h-5 text-[#6f42c1]" />
              <h3 className="text-lg font-black text-gray-900 font-bengali">রেফারেল বোনাস</h3>
            </div>
            <p className="text-sm text-gray-600 max-w-lg leading-relaxed font-medium">
              আপনার ইউনিক রেফারেল লিংক দিয়ে সিস্টেমটি শেয়ার করুন। কেউ রেজিস্ট্রেশন করে ক্রেডিট ব্যবহার করলেই আপনি এবং তিনি উভয়ই <span className="text-[#6f42c1] font-black">২০ বোনাস ক্রেডিট</span> পাবেন।
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="bg-white border border-purple-100 px-4 py-3 rounded-xl font-mono text-[10px] text-gray-400 truncate max-w-[220px] flex items-center">
              {origin}/register?ref={activeTenantId}
            </div>
            <button 
              onClick={copyReferralLink}
              className="bg-[#6f42c1] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
            >
              <Copy className="w-4 h-4" /> কপি করুন
            </button>
          </div>
        </div>
      </Card>
      
      {/* Alert if low balance */}
      {tenant.credits_left < 20 && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
            সতর্কতা: আপনার ক্রেডিট ব্যালেন্স খুব কম। হাজিরা চালু রাখতে রিচার্জ করুন।
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  orderBy, 
  getDoc 
} from "firebase/firestore";
import { Tenant, Payment } from "@/src/lib/types";
import { Card } from "@/src/components/ui/Card";
import { 
  CreditCard, 
  History, 
  Zap, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Download,
  Info
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

/**
 * Billing & Credit Dashboard
 * Step 4.4: Credit Management
 * Restricted to InstitutionAdmin.
 */
export default function BillingPage() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId: storeTenantId } = useUserStore();
  
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Resolve Tenant ID
  useEffect(() => {
    if (storeTenantId) {
      setActiveTenantId(storeTenantId);
    } else if (userData?.tenant_id) {
      setActiveTenantId(userData.tenant_id);
    }
  }, [storeTenantId, userData]);

  // 2. Fetch Billing Data
  useEffect(() => {
    if (!activeTenantId || userData?.role !== "InstitutionAdmin") {
      if (!authLoading && userData && userData.role !== "InstitutionAdmin" && userData.role !== "SuperAdmin") {
          setLoading(false);
      }
      return;
    }

    setLoading(true);

    // Listen to Tenant for real-time credits
    const unsubTenant = onSnapshot(doc(db, "tenants", activeTenantId), (snap) => {
      if (snap.exists()) {
        setTenantData(snap.data() as Tenant);
      }
    });

    // Fetch Payment History
    const q = query(
      collection(db, "payments"),
      where("tenant_id", "==", activeTenantId),
      orderBy("created_at", "desc")
    );

    const unsubPayments = onSnapshot(q, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ ...doc.data(), payment_id: doc.id } as Payment)));
      setLoading(false);
    }, (err) => {
      console.error("Payments Fetch Error:", err);
      // Fallback if index missing
      setLoading(false);
    });

    return () => {
      unsubTenant();
      unsubPayments();
    };
  }, [activeTenantId, userData, authLoading]);

  // Auth/Role Protection
  if (authLoading || (loading && activeTenantId)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">বিলিং ডাটা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  const isAuthorized = userData?.role === "InstitutionAdmin" || userData?.role === "SuperAdmin";
  if (!isAuthorized) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-16 h-16 text-red-200" />
        <h2 className="text-2xl font-black text-red-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 max-w-xs font-bengali">এই পৃষ্ঠাটি দেখার জন্য উপযুক্ত পারমিশন আপনার নেই। শুধুমাত্র ইনস্টিটিউট এডমিন এটি দেখতে পারবেন।</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-bengali">ক্রেডিট ও বিলিং</h1>
        <p className="text-sm text-gray-500 font-medium tracking-tight font-bengali">আপনার প্রতিষ্ঠানের পেমেন্ট হিস্ট্রি এবং ক্রেডিট ব্যালেন্স কোন্ট্রোল করুন।</p>
      </div>

      {/* Credit Overview Card */}
      <Card className="p-0 border-transparent shadow-2xl shadow-purple-500/10 overflow-hidden">
        <div className="bg-gradient-to-br from-[#6f42c1] to-[#59359a] p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="w-32 h-32" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest opacity-80">বর্তমান ব্যালেন্স</span>
            </div>
            
            <div className="flex items-end gap-3">
              <h2 className="text-6xl font-black">{tenantData?.credits_left || 0}</h2>
              <span className="text-lg font-bold mb-2 opacity-80 font-bengali">ক্রেডিট</span>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button 
                onClick={() => toast.info("বিকাশ বা নগদের পেমেন্ট গেটওয়ে ইন্টিগ্রেশন শীঘ্রই আসছে। বর্তমানে ম্যানুয়াল পেমেন্ট করতে কল করুন।")}
                className="bg-white text-[#6f42c1] px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all font-bengali"
              >
                রিচার্জ করুন
              </button>
              <button 
                onClick={() => toast.info("কুপন কোড ফিচারটি শীঘ্রই চালু হবে।")}
                className="bg-purple-400/30 border border-white/20 backdrop-blur-md px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all font-bengali"
              >
                কুপন ব্যবহার
              </button>
            </div>
          </div>
        </div>

        {/* Credit System Info */}
        <div className="bg-white p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
           <div className="flex items-center gap-4 py-2 sm:py-0">
             <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
               <TrendingUp className="w-5 h-5 text-purple-600" />
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Cost</p>
               <p className="text-sm font-black text-gray-900">২ ক্রেডিট / ক্লাস</p>
             </div>
           </div>
           <div className="flex items-center gap-4 py-4 sm:py-0 sm:pl-6">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
               <AlertCircle className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SMS Alert</p>
               <p className="text-sm font-black text-gray-900">০.৫০ ক্রেডিট / মেসজে</p>
             </div>
           </div>
           <div className="flex items-center gap-4 py-2 sm:py-0 sm:pl-6">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
               <Info className="w-5 h-5 text-emerald-600" />
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
               <p className="text-sm font-black text-emerald-600 uppercase">ACTIVE</p>
             </div>
           </div>
        </div>
      </Card>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <History className="w-5 h-5 text-gray-400" />
             <h2 className="text-lg font-black text-gray-900 font-bengali">পেমেন্ট হিস্ট্রি</h2>
           </div>
           <button className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1 hover:underline">
             Download Reports <Download className="w-3 h-3" />
           </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 font-bengali">তারিখ ও সময়</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 font-bengali">মেথড / ট্রানজেকশন</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 font-bengali">পরিমান</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 font-bengali">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.payment_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{new Date(p.created_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{new Date(p.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          p.method === "bKash" ? "bg-pink-50 text-pink-600" : "bg-orange-50 text-orange-600"
                        )}>
                          {p.method}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">{p.transaction_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-gray-900">৳{p.amount}</p>
                      {p.credits_added && (
                        <p className="text-[10px] text-emerald-600 font-bold tracking-widest">+{p.credits_added} Credits</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        p.status === "approved" ? "bg-emerald-50 text-emerald-600" : 
                        p.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                      )}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                       <History className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-bengali">এখনো কোনো ট্রানজেকশন করা হয়নি</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

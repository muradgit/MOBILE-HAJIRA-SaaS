"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  where,
  doc
} from "firebase/firestore";
import { Tenant, CreditHistory } from "@/src/lib/types";
import { Card } from "@/src/components/ui/Card";
import { 
  Zap, 
  Coins, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  ArrowRight,
  Loader2,
  History,
  Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

export default function CreditTopupPage() {
  const { userData, loading: authLoading } = useAuth();
  const tenantId = userData?.tenant_id;
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  const BKASH_MARCHANT_NUMBER = "017XXXXXXXX"; // Placeholder bKash number

  useEffect(() => {
    if (!tenantId || authLoading) return;

    // 1. Listen to Tenant Data
    const unsubTenant = onSnapshot(doc(db, "tenants", tenantId), (snap) => {
      if (snap.exists()) {
        setTenant(snap.data() as Tenant);
      }
      setLoading(false);
    });

    // 2. Listen to Credit History
    const historyQuery = query(
      collection(db, `tenants/${tenantId}/credit_history`),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CreditHistory));
    });

    return () => {
      unsubTenant();
      unsubHistory();
    };
  }, [tenantId, authLoading]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || transactionId.length < 8) {
      toast.error("সঠিক ট্রানজেকশন আইডি দিন।");
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch("/api/credits/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transactionId.trim(),
          tenantId,
          userId: userData?.user_id
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setTransactionId("");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      } else {
        toast.error(data.error || "ক্রেডিট ক্লেইম করা সম্ভব হয়নি।");
      }
    } catch (error) {
      toast.error("সার্ভার সমস্যা! পরে চেষ্টা করুন।");
    } finally {
      setClaiming(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("নম্বরটি কপি করা হয়েছে");
  };

  if (authLoading || (loading && !tenant)) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-white">
        <Loader2 className="w-8 h-8 text-[#6f42c1] animate-spin" />
      </div>
    );
  }

  const credits = tenant?.credits_left || 0;

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-5xl mx-auto pb-40">
      
      {/* 1. Header & Current Balance */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
             <h1 className="text-3xl font-black text-gray-900 font-bengali">ক্রেডিট রিচার্জ</h1>
             <p className="text-sm font-bold text-gray-400">Recharge your institution credits via bKash.</p>
          </div>
          
          <Card className="p-6 bg-[#6f42c1] text-white border-none shadow-xl shadow-purple-500/20 flex items-center gap-6 rounded-[2rem]">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-200">বর্তমান ব্যালেন্স</p>
                <h2 className="text-3xl font-black">{credits}</h2>
             </div>
          </Card>
        </div>

        {credits < 50 && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
             <AlertCircle className="w-5 h-5" />
             <p className="text-xs font-bold font-bengali tracking-tight">আপনার ক্রেডিট শেষ হয়ে যাচ্ছে! হাজিরা সিস্টেম সচল রাখতে দ্রুত রিচার্জ করুন।</p>
          </div>
        )}
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Instructions */}
        <div className="space-y-8">
           <div className="space-y-4">
             <h3 className="text-lg font-black text-gray-900 font-bengali flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-600" /> কিভাবে পেমেন্ট করবেন?
             </h3>
             
             <div className="space-y-4 relative">
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-purple-100" />
                
                {[
                  { step: 1, title: "বিকাশ অ্যাপ ওপেন করুন", desc: "আপনার বিকাশ অ্যাপে গিয়ে 'Make Payment' অপশনটি বেছে নিন।" },
                  { step: 2, title: "নম্বরটি দিন", desc: `নিচের মার্চেন্ট নম্বরটি দিন: ${BKASH_MARCHANT_NUMBER}` },
                  { step: 3, title: "টাকার পরিমাণ", desc: "যত ক্রেডিট নিতে চান সেই পরিমাণ টাকা লিখুন (১ টাকা = ১ ক্রেডিট)।" },
                  { step: 4, title: "ট্রানজেকশন আইডি সংগ্রহ করুন", desc: "পেমেন্ট সফল হওয়ার পর SMS বা অ্যাপ থেকে TrxID কপি করুন।" },
                ].map((s) => (
                  <div key={s.step} className="flex gap-6 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-purple-100 flex items-center justify-center text-[#6f42c1] font-black text-sm shrink-0 shadow-sm">
                      {s.step}
                    </div>
                    <div className="pt-2">
                      <h4 className="text-sm font-black text-gray-900 font-bengali">{s.title}</h4>
                      <p className="text-[11px] font-bold text-gray-400 mt-0.5 font-bengali">{s.desc}</p>
                    </div>
                  </div>
                ))}
             </div>
           </div>

           <Card className="p-8 border-none bg-emerald-900 text-white rounded-[2.5rem] shadow-xl shadow-emerald-900/10 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 scale-150">
                 <CreditCard className="w-32 h-32" />
              </div>
              <div className="relative z-10 space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">bKash Merchant Number</p>
                 <div className="flex items-center justify-between gap-4">
                    <h2 className="text-3xl font-black tracking-tight">{BKASH_MARCHANT_NUMBER}</h2>
                    <button 
                      onClick={() => copyToClipboard(BKASH_MARCHANT_NUMBER)}
                      className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                    >
                       <Copy className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black text-emerald-200">Payment Message: Institution_Name (Optional)</p>
                 </div>
              </div>
           </Card>
        </div>

        {/* Right: Claim Form & History */}
        <div className="space-y-8">
           
           {/* Claim Form */}
           <div className="space-y-4">
              <h3 className="text-lg font-black text-gray-900 font-bengali flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> ক্রেডিট ক্লেইম করুন
              </h3>
              <Card className="p-8 border-none bg-white rounded-[2.5rem] shadow-2xl shadow-purple-900/5">
                <form onSubmit={handleClaim} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction ID (TrxID)</label>
                      <input 
                        required
                        value={transactionId}
                        onChange={e => setTransactionId(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all uppercase placeholder:normal-case"
                        placeholder="Ex: 8X9Y7Z..."
                      />
                   </div>

                   <button 
                    disabled={claiming}
                    className="w-full bg-[#6f42c1] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 shrink-0" />}
                     ক্লেইম করুন
                   </button>
                   
                   <p className="text-[9px] text-center font-bold text-gray-400 uppercase tracking-widest">
                      Your credits will be updated instantly after verification.
                   </p>
                </form>
              </Card>
           </div>

           {/* History */}
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <History className="w-4 h-4" /> রিচার্জ হিস্ট্রি
                </h3>
              </div>
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="p-4 bg-white border border-gray-50 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-xs",
                          h.type === 'purchase' ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"
                        )}>
                           {h.type === 'purchase' ? <Coins className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div>
                           <p className="text-[13px] font-black text-gray-900 leading-none">+{h.amount} ক্রেডিট</p>
                           <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{h.description}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-gray-900 leading-none">৳{h.amount}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                           {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleDateString() : "Just now"}
                        </p>
                     </div>
                  </div>
                ))}
                {history.length === 0 && (
                   <div className="py-10 text-center text-gray-300 italic text-xs">No transaction history found.</div>
                )}
              </div>
           </div>
           
        </div>

      </div>

    </div>
  );
}

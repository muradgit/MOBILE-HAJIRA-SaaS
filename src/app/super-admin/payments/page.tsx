"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  addDoc,
  setDoc,
  orderBy, 
  increment,
  writeBatch
} from "firebase/firestore";
import { toast } from "sonner";
import { 
  CreditCard, 
  Ticket, 
  Loader2, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Building2,
  Calendar,
  Zap
} from "lucide-react";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { Card } from "@/src/components/ui/Card";
import { Payment, Tenant, PromoCode } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - Payments & Credit System Module
 * 1. Payment Logs & Approval
 * 2. Manual Credit Control
 * 3. Promo/Coupon Management
 */
export default function PaymentsCreditsPage() {
  const { userData, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"logs" | "credits">("logs");
  
  // Data State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal/Drawer State
  const [isCouponDrawerOpen, setIsCouponDrawerOpen] = useState(false);

  // Manual Credit Form State
  const [manualCredit, setManualCredit] = useState({
    tenant_id: "",
    amount: 0,
    reason: ""
  });

  // Promo Code Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    credit_value: 0,
    expiry_date: ""
  });

  // Fetch Data
  useEffect(() => {
    if (userData?.role !== "super_admin") return;

    const unsubPayments = onSnapshot(query(collection(db, "payments"), orderBy("created_at", "desc")), (snap) => {
      setPayments(snap.docs.map(d => ({ payment_id: d.id, ...d.data() } as Payment)));
    });

    const unsubTenants = onSnapshot(query(collection(db, "tenants")), (snap) => {
      setTenants(snap.docs.map(d => d.data() as Tenant));
    });

    const unsubPromos = onSnapshot(query(collection(db, "promo_codes"), orderBy("created_at", "desc")), (snap) => {
      setPromoCodes(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoCode)));
      setLoading(false);
    });

    return () => {
      unsubPayments();
      unsubTenants();
      unsubPromos();
    };
  }, [userData]);

  // Tenant Mapping
  const getTenantName = (tid: string) => tenants.find(t => t.tenant_id === tid)?.name || tid;

  // Handle Payment Approval
  const handleApprovePayment = async (payment: Payment) => {
    if (payment.status !== "pending") return;
    
    const toastId = toast.loading("পেমেন্ট অ্যাপ্রুভ হচ্ছে...");
    try {
      const batch = writeBatch(db);
      
      // Calculate credits based on amount (e.g. 1 BDT = 1 Credit for this logic, 
      // but in Hajira app 1 SMS = 0.5 credits. Adjust formula as needed)
      const creditsToAdd = payment.amount; 

      // 1. Update Payment Status
      batch.update(doc(db, "payments", payment.payment_id), {
        status: "approved",
        approved_at: new Date().toISOString(),
        credits_added: creditsToAdd
      });

      // 2. Increment Tenant Credits
      // CRITICAL: Master Rule - Check credit balance in Firestore using increment()
      batch.update(doc(db, "tenants", payment.tenant_id), {
        credits_left: increment(creditsToAdd),
        total_credit_purchased: increment(creditsToAdd)
      });

      await batch.commit();
      toast.success("পেমেন্ট অ্যাপ্রুভ ও ক্রেডিট যুক্ত হয়েছে", { id: toastId });
    } catch (error: any) {
      toast.error("ভুল হয়েছে: " + error.message, { id: toastId });
    }
  };

  const handleRejectPayment = async (payment: Payment, action: "rejected" | "refunded") => {
    const toastId = toast.loading(`পেমেন্ট ${action} হচ্ছে...`);
    try {
      await updateDoc(doc(db, "payments", payment.payment_id), { status: action });
      toast.success(`পেমেন্ট সফলভাবে ${action} করা হয়েছে`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Handle Manual Credit Transfer
  const handleManualCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCredit.tenant_id || manualCredit.amount <= 0) return;

    const toastId = toast.loading("ক্রেডিট ট্রান্সফার হচ্ছে...");
    try {
      const batch = writeBatch(db);
      
      // Update tenant
      batch.update(doc(db, "tenants", manualCredit.tenant_id), {
        credits_left: increment(manualCredit.amount)
      });

      // Log the manual adjustment in a sub-collection or separate log
      const logRef = doc(collection(db, "system_logs"));
      batch.set(logRef, {
        type: "MANUAL_CREDIT",
        tenant_id: manualCredit.tenant_id,
        amount: manualCredit.amount,
        reason: manualCredit.reason,
        created_at: new Date().toISOString(),
        created_by: userData?.user_id
      });

      await batch.commit();
      toast.success("সফলভাবে ক্রেডিট যুক্ত হয়েছে", { id: toastId });
      setManualCredit({ tenant_id: "", amount: 0, reason: "" });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Handle New Coupon Creation
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("কুপন তৈরি হচ্ছে...");
    try {
      await addDoc(collection(db, "promo_codes"), {
        ...newCoupon,
        status: "active",
        usage_count: 0,
        created_at: new Date().toISOString()
      });
      toast.success("কুপন সফলভাবে তৈরি হয়েছে", { id: toastId });
      setIsCouponDrawerOpen(false);
      setNewCoupon({ code: "", credit_value: 0, expiry_date: "" });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Auth/Loading Component
  if (authLoading || (userData && loading)) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
    </div>
  );

  if (userData?.role !== "super_admin") return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <ShieldAlert className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-black text-gray-900 font-bengali">অ্যাক্সেস ডিনাইড</h2>
      <p className="text-gray-500">এই পৃষ্ঠাটি দেখার অনুমতি আপনার নেই।</p>
    </div>
  );

  const paymentColumns = [
    { 
      header: "প্রতিষ্ঠান", 
      accessorKey: "tenant_id",
      cell: (item: Payment) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 truncate max-w-[150px]">{getTenantName(item.tenant_id)}</span>
          <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{item.tenant_id}</span>
        </div>
      )
    },
    { 
      header: "টাকার পরিমাণ", 
      accessorKey: "amount",
      cell: (item: Payment) => <span className="font-black text-emerald-600">৳{item.amount.toLocaleString()}</span>
    },
    { 
      header: "মেথড", 
      accessorKey: "method",
      cell: (item: Payment) => (
        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
          {item.method}
        </span>
      )
    },
    { 
      header: "স্ট্যাটাস", 
      accessorKey: "status",
      cell: (item: Payment) => (
        <span className={cn(
          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
          item.status === "approved" ? "bg-green-50 text-green-600" : 
          item.status === "pending" ? "bg-orange-50 text-orange-600 animate-pulse" : 
          "bg-red-50 text-red-600"
        )}>
          {item.status}
        </span>
      )
    },
  ];

  const couponColumns = [
    { header: "কুপন কোড", accessorKey: "code", cell: (item: PromoCode) => <span className="font-black text-purple-600 uppercase tracking-widest">{item.code}</span> },
    { header: "ক্রেডিট ভ্যালু", accessorKey: "credit_value", cell: (item: PromoCode) => <span className="font-bold">{item.credit_value} Credits</span> },
    { header: "মেয়াদ", accessorKey: "expiry_date", cell: (item: PromoCode) => (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar className="w-3.5 h-3.5" /> {item.expiry_date}
      </div>
    )},
    { 
      header: "স্ট্যাটাস", 
      accessorKey: "status",
      cell: (item: PromoCode) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
          item.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
        )}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali">পেমেন্ট ও ক্রেডিট</h1>
            <p className="text-sm text-gray-500 font-medium">আর্থিক লেনদেন এবং ক্রেডিট ব্যালেন্স নিয়ন্ত্রণ</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl self-start sm:self-center">
          <button 
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "logs" ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            পেমেন্ট লগ
          </button>
          <button 
            onClick={() => setActiveTab("credits")}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "credits" ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            কুপন ও ক্রেডিট
          </button>
        </div>
      </div>

      {activeTab === "logs" ? (
        /* Payment Logs View */
        <div className="bg-white rounded-3xl p-2 sm:p-6 shadow-sm border border-gray-100">
          <DataTable 
            columns={paymentColumns} 
            data={payments}
            onEdit={(item: Payment) => {
              if (item.status === "pending") handleApprovePayment(item);
              else toast.info("এটি অলরেডি প্রসেস করা হয়েছে");
            }}
            onDelete={(item: Payment) => handleRejectPayment(item, "rejected")}
          />
        </div>
      ) : (
        /* Coupons & Manual Credits View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Manual Credit Form */}
          <Card title="ম্যানুয়াল ক্রেডিট ট্রান্সফার" icon={Zap} className="lg:col-span-1 border-purple-100">
            <form onSubmit={handleManualCreditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Institution</label>
                <select 
                  required
                  value={manualCredit.tenant_id}
                  onChange={(e) => setManualCredit({...manualCredit, tenant_id: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
                >
                  <option value="">প্রতিষ্ঠান সিলেক্ট করুন</option>
                  {tenants.map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.name} (EIIN: {t.eiin})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Credit Amount</label>
                <input 
                  required
                  type="number"
                  value={manualCredit.amount || ""}
                  onChange={(e) => setManualCredit({...manualCredit, amount: Number(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
                  placeholder="উদা: 500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason (ঐচ্ছিক)</label>
                <input 
                  value={manualCredit.reason}
                  onChange={(e) => setManualCredit({...manualCredit, reason: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none"
                  placeholder="উদা: প্রমোশন বোনাস"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> ক্রেডিট যুক্ত করুন
              </button>
            </form>
          </Card>

          {/* Promo Codes Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-black text-gray-900 font-bengali">প্রমো কোড ও কুপন</h3>
              </div>
              <button 
                onClick={() => setIsCouponDrawerOpen(true)}
                className="bg-white border border-purple-100 text-[#6f42c1] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-50 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> নতুন কুপন
              </button>
            </div>

            <div className="bg-white rounded-3xl p-2 sm:p-5 shadow-sm border border-gray-100">
              <DataTable 
                columns={couponColumns} 
                data={promoCodes}
              />
            </div>
          </div>
        </div>
      )}

      {/* SlideOver Form for New Coupon */}
      <SlideOverForm 
        isOpen={isCouponDrawerOpen} 
        onClose={() => setIsCouponDrawerOpen(false)} 
        title="নতুন প্রমো কোড তৈরি"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Promo Code</label>
            <input 
              required
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-black focus:ring-2 focus:ring-[#6f42c1] outline-none uppercase tracking-widest"
              placeholder="e.g. SUMMER2026"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Credit Value</label>
            <input 
              required
              type="number"
              value={newCoupon.credit_value || ""}
              onChange={(e) => setNewCoupon({...newCoupon, credit_value: Number(e.target.value)})}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
              placeholder="উদা: 100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                required
                type="date"
                value={newCoupon.expiry_date}
                onChange={(e) => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
              />
            </div>
          </div>

          <p className="p-4 bg-purple-50 rounded-xl text-[10px] text-purple-600 font-bold leading-relaxed">
            * নতুন কুপন তৈরি করার সাথে সাথে এটি লাইভ হয়ে যাবে। ইউজাররা তাদের ড্যাশবোর্ড থেকে এই কোডটি ব্যবহার করে বোনাস ক্রেডিট ক্লেইম করতে পারবেন।
          </p>

          <button 
            type="submit"
            className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> কুপন সেভ করুন
          </button>
        </form>
      </SlideOverForm>
    </div>
  );
}

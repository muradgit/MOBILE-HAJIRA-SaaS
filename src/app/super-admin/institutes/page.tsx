"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  updateDoc, 
  orderBy 
} from "firebase/firestore";
import { toast } from "sonner";
import { 
  Plus, 
  Building2, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ExternalLink 
} from "lucide-react";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { Tenant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - Institute Management Page
 * Handles CRUD for institutions (Tenants) with Soft Delete policies.
 */
export default function InstituteManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    nameBN: "",
    eiin: "",
    institutionType: "School" as any,
    owner_email: "",
    phone: "",
    credits_left: 100,
  });

  // Fetch Tenants
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    try {
      const q = query(collection(db, "tenants"), orderBy("name", "asc"));
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => doc.data() as Tenant);
          setTenants(data);
          setLoading(false);
          setIndexError(null);
        },
        (error) => {
          console.error("Firestore Error:", error);
          if (error.message.includes("index")) {
            const url = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
            setIndexError(url || "Index Required");
          }
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Query Build Error:", err);
      setLoading(false);
    }
  }, [userData]);

  // Handle Create/Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("সেভ করা হচ্ছে...");

    try {
      const tenantId = editingTenant?.tenant_id || `tenant_${Date.now()}`;
      const docRef = doc(db, "tenants", tenantId);

      const finalData: Partial<Tenant> = {
        ...formData,
        tenant_id: tenantId,
        status: editingTenant?.status || "active",
        googleSheetId: editingTenant?.googleSheetId || "",
        promo_code: editingTenant?.promo_code || `PROMO_${Math.random().toString(36).substring(7).toUpperCase()}`,
        referral_count: editingTenant?.referral_count || 0,
        credits_left: Number(formData.credits_left)
      };

      await setDoc(docRef, finalData, { merge: true });
      
      toast.success(editingTenant ? "আপডেট সফল হয়েছে" : "প্রতিষ্ঠান তৈরি সফল হয়েছে", { id: toastId });
      setIsDrawerOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error("ভুল হয়েছে: " + error.message, { id: toastId });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameBN: "",
      eiin: "",
      institutionType: "School",
      owner_email: "",
      phone: "",
      credits_left: 100,
    });
    setEditingTenant(null);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name || "",
      nameBN: tenant.nameBN || "",
      eiin: tenant.eiin || "",
      institutionType: tenant.institutionType || "School",
      owner_email: tenant.owner_email || "",
      phone: tenant.phone || "",
      credits_left: tenant.credits_left || 0,
    });
    setIsDrawerOpen(true);
  };

  const toggleStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const toastId = toast.loading(`স্ট্যাটাস পরিবর্তন হচ্ছে...`);
    try {
      await updateDoc(doc(db, "tenants", tenant.tenant_id), { status: newStatus });
      toast.success(`এখন এটি ${newStatus}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই প্রতিষ্ঠানটি সফট ডিলিট করতে চান? এটি ডিয়াক্টিভেটেড হয়ে থাকবে।")) return;
    
    const toastId = toast.loading(`সফট ডিলিট হচ্ছে...`);
    try {
      await updateDoc(doc(db, "tenants", tenant.tenant_id), { status: "deactivated" });
      toast.success(`সফলভাবে ডিয়াক্টিভেট করা হয়েছে`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Auth Protection
  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
    </div>
  );

  if (userData?.role !== "SuperAdmin") return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <ShieldAlert className="w-16 h-16 text-red-500" />
      <h2 className="text-2xl font-black text-gray-900 font-bengali">অ্যাক্সেস ডিনাইড</h2>
      <p className="text-gray-500">এই পৃষ্ঠাটি দেখার অনুমতি আপনার নেই।</p>
    </div>
  );

  const columns = [
    { 
      header: "প্রতিষ্ঠানের নাম", 
      accessorKey: "name",
      cell: (item: Tenant) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{item.name}</span>
          <span className="text-xs text-gray-400 font-bengali">{item.nameBN}</span>
        </div>
      )
    },
    { header: "EIIN", accessorKey: "eiin" },
    { 
      header: "ক্রেডিট", 
      accessorKey: "credits_left",
      cell: (item: Tenant) => (
        <span className={cn(
          "font-black px-3 py-1 rounded-full text-xs",
          item.credits_left < 20 ? "bg-red-50 text-red-600" : "bg-purple-50 text-[#6f42c1]"
        )}>
          {item.credits_left}
        </span>
      )
    },
    { 
      header: "স্ট্যাটাস", 
      accessorKey: "status",
      cell: (item: Tenant) => (
        <div className="flex items-center gap-2">
          {item.status === "active" ? (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500 bg-green-50 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : item.status === "suspended" ? (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
              <AlertTriangle className="w-3 h-3" /> Suspended
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
              <XCircle className="w-3 h-3" /> Deactivated
            </span>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali">প্রতিষ্ঠান ম্যানেজমেন্ট</h1>
            <p className="text-sm text-gray-500">সকল নিবন্ধিত প্রতিষ্ঠানের তালিকা এবং নিয়ন্ত্রণ</p>
          </div>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsDrawerOpen(true); }}
          className="bg-[#6f42c1] text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> নতুন প্রতিষ্ঠান
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl p-2 sm:p-6 shadow-sm border border-gray-100">
        {indexError ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <AlertTriangle className="w-16 h-16 text-orange-500" />
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900 font-bengali tracking-tight">ডাটাবেজ ইনডেক্স প্রয়োজন</h3>
                <p className="text-sm text-gray-500 font-medium">লিস্টটি দেখার জন্য আপনাকে একটি ফায়ারবেস ইনডেক্স তৈরি করতে হবে।</p>
             </div>
             <a 
               href={indexError} 
               target="_blank" 
               className="bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
             >
               Database Index Setup Required - Click here to fix <ExternalLink className="w-4 h-4" />
             </a>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={tenants}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Drawer Form */}
      <SlideOverForm 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={editingTenant ? "প্রতিষ্ঠান এডিট করুন" : "নতুন প্রতিষ্ঠান যোগ করুন"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Institute Name (English)</label>
                <input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                  placeholder="e.g. Dhaka International College"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">প্রতিষ্ঠানের নাম (বাংলা)</label>
                <input 
                  required
                  value={formData.nameBN}
                  onChange={(e) => setFormData({...formData, nameBN: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bengali focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                  placeholder="উদা: ঢাকা ইন্টারন্যাশনাল কলেজ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">EIIN</label>
                <input 
                  required
                  value={formData.eiin}
                  onChange={(e) => setFormData({...formData, eiin: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                  placeholder="123456"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Type</label>
                <select 
                  value={formData.institutionType}
                  onChange={(e) => setFormData({...formData, institutionType: e.target.value as any})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all appearance-none"
                >
                  <option value="School">School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                  <option value="Coaching Center">Coaching Center</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Admin Email</label>
              <input 
                required
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                placeholder="admin@institution.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Admin Phone</label>
              <input 
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                placeholder="017XXXXXXXX"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Initial Credits</label>
              <input 
                required
                type="number"
                value={formData.credits_left}
                onChange={(e) => setFormData({...formData, credits_left: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all"
                placeholder="100"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            {editingTenant ? "আপডেট করুন" : "প্রতিষ্ঠান সংরক্ষণ করুন"}
          </button>

          {editingTenant && (
            <button 
              type="button"
              onClick={() => toggleStatus(editingTenant as Tenant)}
              className={cn(
                "w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                editingTenant.status === "active" 
                  ? "border-orange-100 text-orange-500 bg-orange-50 hover:bg-orange-100" 
                  : "border-green-100 text-green-500 bg-green-50 hover:bg-green-100"
              )}
            >
              {editingTenant.status === "active" ? "Suspend Institute" : "Activate Institute"}
            </button>
          )}
        </form>
      </SlideOverForm>
    </div>
  );
}

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
  orderBy,
  deleteDoc 
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
  ExternalLink,
  Trash2 
} from "lucide-react";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { Tenant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - Global Institution Management Module
 * Full control over all tenants in the system.
 */
export default function InstitutionManagement() {
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

  // Fetch Tenants (Global for SuperAdmin)
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    try {
      // SuperAdmins fetch everything
      const q = query(collection(db, "tenants"), orderBy("name", "asc"));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => doc.data() as Tenant);
          setTenants(data);
          setLoading(false);
          setIndexError(null);
        },
        (error) => {
          console.error("Firestore Tenants Error:", error);
          if (error.message.includes("index")) {
            const url = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
            setIndexError(url || "Index Required. Check browser console.");
          } else {
            toast.error("ডাটা লোড করতে সমস্যা হয়েছে: " + error.message);
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
    const toastId = toast.loading(editingTenant ? "আপডেট হচ্ছে..." : "তৈরি হচ্ছে...");
    
    try {
      const tenantId = editingTenant?.tenant_id || `tenant_${Date.now()}`;
      const tenantData = {
        tenant_id: tenantId,
        ...formData,
        status: editingTenant?.status || "active",
        created_at: editingTenant?.created_at || new Date().toISOString(),
      };

      await setDoc(doc(db, "tenants", tenantId), tenantData, { merge: true });
      toast.success(editingTenant ? "সফলভাবে আপডেট হয়েছে" : "সফলভাবে তৈরি হয়েছে", { id: toastId });
      setIsDrawerOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
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

  // Hard Delete Institution
  const handleHardDelete = async (tenant: Tenant) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${tenant.name}" কে স্থায়ীভাবে মুছে ফেলতে চান? এই প্রতিষ্ঠানের সকল ইউজার এবং ডাটা অ্যাক্সেস চিরতরে বন্ধ হয়ে যাবে।`)) return;
    
    const toastId = toast.loading(`স্থায়ীভাবে মুছে ফেলা হচ্ছে...`);
    try {
      await deleteDoc(doc(db, "tenants", tenant.tenant_id));
      toast.success(`সাফল্যজনকভাবে মুছে ফেলা হয়েছে`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      name: "",
      nameBN: "",
      eiin: "",
      institutionType: "School",
      owner_email: "",
      phone: "",
      credits_left: 100,
    });
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
          <span className="font-bold text-gray-900 leading-none">{item.name}</span>
          <span className="text-[11px] text-gray-400 font-bengali mt-1">{item.nameBN}</span>
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
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali">প্রতিষ্ঠান ম্যানেজমেন্ট</h1>
            <p className="text-sm text-gray-500">নিবন্ধিত প্রতিষ্ঠানের তালিকা এবং নিয়ন্ত্রণ কেন্দ্র</p>
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
                <p className="text-sm text-gray-500 font-medium tracking-tight">লিস্টটি দেখার জন্য আপনাকে একটি ফায়ারবেস ইনডেক্স তৈরি করতে হবে।</p>
                <p className="text-[10px] text-gray-400 font-mono mt-2">{indexError}</p>
             </div>
             <a 
               href={indexError.startsWith("http") ? indexError : "#"} 
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
            onDelete={(t) => handleHardDelete(t)}
          />
        )}
      </div>

      {/* Drawer Form */}
      <SlideOverForm 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={editingTenant ? "প্রতিষ্ঠানের তথ্য এডিট" : "নতুন প্রতিষ্ঠান যোগ করুন"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
          <div className="space-y-4">
             <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Institution Name (English)</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" placeholder="Primary School" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">প্রতিষ্ঠানের নাম (বাংলা)</label>
                  <input required value={formData.nameBN} onChange={e => setFormData({...formData, nameBN: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bengali font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" placeholder="প্রাথমিক বিদ্যালয়" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">EIIN / Code</label>
                  <input required value={formData.eiin} onChange={e => setFormData({...formData, eiin: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" placeholder="123456" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type</label>
                  <select value={formData.institutionType} onChange={e => setFormData({...formData, institutionType: e.target.value as any})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none">
                     <option value="School">School</option>
                     <option value="College">College</option>
                     <option value="Madrasha">Madrasha</option>
                     <option value="University">University</option>
                     <option value="Coaching Center">Coaching Center</option>
                  </select>
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Owner Email</label>
                <input required type="email" value={formData.owner_email} onChange={e => setFormData({...formData, owner_email: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" placeholder="admin@domain.com" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" placeholder="01XXX" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SMS Credits</label>
                  <input required type="number" value={formData.credits_left} onChange={e => setFormData({...formData, credits_left: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none" />
                </div>
             </div>
          </div>

          <button type="submit" className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
            {editingTenant ? "আপডেট নিশ্চিত করুন" : "প্রতিষ্ঠান যোগ করুন"}
          </button>

          {editingTenant && (
            <button 
              type="button"
              onClick={() => handleHardDelete(editingTenant as Tenant)}
              className="w-full py-4 rounded-2xl border border-red-100 bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" /> এই প্রতিষ্ঠানটি চিরতরে মুছে ফেলুন
            </button>
          )}
        </form>
      </SlideOverForm>
    </div>
  );
}

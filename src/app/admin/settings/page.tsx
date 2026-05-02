"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { db } from "@/src/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Card } from "@/src/components/ui/Card";
import { 
  Plus, 
  Settings, 
  Loader2, 
  GraduationCap, 
  Layers, 
  Calendar, 
  Clock,
  ShieldAlert,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Tenant } from "@/src/lib/types";
import { normalizeRole } from "@/src/lib/auth-utils";

/**
 * Institute Admin Settings Page
 */
export default function AdminSettingsPage() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId } = useUserStore();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  
  // General Info Form State
  const [generalInfo, setGeneralInfo] = useState({
    name: "",
    nameBN: "",
    eiin: "",
    googleSheetId: "",
    address: "",
    phone: "",
    website: "",
    academicLevels: [] as string[]
  });

  const [savingGeneral, setSavingGeneral] = useState(false);

  // Form States for each list section
  const [inputs, setInputs] = useState({
    class: "",
    department: "",
    session: "",
    shift: ""
  });
  
  const [savingLists, setSavingLists] = useState({
    class: false,
    department: false,
    session: false,
    shift: false
  });

  // Fetch current settings from Firestore with real-time updates
  useEffect(() => {
    if (!tenantId) return;

    const unsub = onSnapshot(doc(db, "tenants", tenantId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Tenant;
        setTenant(data);
        setGeneralInfo({
          name: data.name || "",
          nameBN: data.nameBN || "",
          eiin: data.eiin || "",
          googleSheetId: data.googleSheetId || "",
          address: data.address || "",
          phone: data.admin_mobile || "",
          website: data.website || "",
          academicLevels: data.academicLevels || []
        });
      } else {
        console.error("Tenant document not found");
      }
      setLoading(false);
    }, (error) => {
      console.error("Fetch Settings Error:", error);
      toast.error("সেটিংস লোড করতে সমস্যা হয়েছে");
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  const handleSaveGeneralInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSavingGeneral(true);
    try {
      await updateDoc(doc(db, "tenants", tenantId), {
        name: generalInfo.name,
        nameBN: generalInfo.nameBN,
        eiin: generalInfo.eiin,
        googleSheetId: generalInfo.googleSheetId,
        address: generalInfo.address,
        admin_mobile: generalInfo.phone,
        website: generalInfo.website,
        academicLevels: generalInfo.academicLevels,
        updated_at: new Date().toISOString()
      });
      toast.success("প্রতিষ্ঠান তথ্য সফলভাবে আপডেট করা হয়েছে");
    } catch (error: any) {
      toast.error("আপডেট করতে ব্যর্থ: " + error.message);
    } finally {
      setSavingGeneral(false);
    }
  };

  // Unified handler to add an item to an array field in the tenant document
  const handleAddItem = async (field: keyof typeof inputs, collectionName: "classes" | "departments" | "sessions" | "shifts") => {
    const value = inputs[field].trim();
    if (!value || !tenantId) return;

    // Local check for duplicates to prevent unnecessary server calls
    const currentList = (tenant?.[collectionName] as string[]) || [];
    if (currentList.includes(value)) {
      toast.error("এই তথ্যটি ইতিমধ্যে যুক্ত করা আছে");
      return;
    }

    setSavingLists(prev => ({ ...prev, [field]: true }));
    try {
      await updateDoc(doc(db, "tenants", tenantId), {
        [collectionName]: arrayUnion(value)
      });
      setInputs(prev => ({ ...prev, [field]: "" }));
      toast.success(`${value} সফলভাবে যুক্ত করা হয়েছে`);
    } catch (error: any) {
      toast.error("ভুল হয়েছে: " + error.message);
    } finally {
      setSavingLists(prev => ({ ...prev, [field]: false }));
    }
  };

  // Unified handler to remove an item from an array field
  const handleDeleteItem = async (value: string, collectionName: "classes" | "departments" | "sessions" | "shifts") => {
    if (!tenantId) return;

    const confirmDelete = window.confirm(`আপনি কি নিশ্চিতভাবে "${value}" মুছে ফেলতে চান?`);
    if (!confirmDelete) return;

    try {
      await updateDoc(doc(db, "tenants", tenantId), {
        [collectionName]: arrayRemove(value)
      });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
    } catch (error: any) {
      toast.error("ভুল হয়েছে: " + error.message);
    }
  };

  // Helper component for each settings section to keep code DRY
  const SettingsSection = ({ 
    title, 
    icon, 
    field, 
    collectionName, 
    placeholder,
    items 
  }: { 
    title: string, 
    icon: any, 
    field: keyof typeof inputs, 
    collectionName: "classes" | "departments" | "sessions" | "shifts",
    placeholder: string,
    items: string[]
  }) => (
    <Card title={title} icon={icon} className="h-full">
      <div className="space-y-6">
        {/* Simple inline form */}
        <div className="flex gap-2">
          <input 
            type="text"
            value={inputs[field]}
            onChange={(e) => setInputs(prev => ({ ...prev, [field]: e.target.value }))}
            placeholder={placeholder}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bengali"
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(field, collectionName)}
          />
          <button 
            onClick={() => handleAddItem(field, collectionName)}
            disabled={savingLists[field] || !inputs[field].trim()}
            className="bg-[#6f42c1] text-white p-3 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center w-12"
          >
            {savingLists[field] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* Existing items rendered as badges */}
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {items && items.length > 0 ? (
            items.map((item, idx) => (
              <div 
                key={idx}
                className="bg-purple-50 border border-purple-100 text-[#6f42c1] px-4 py-2 rounded-2xl flex items-center gap-2 group animate-in fade-in zoom-in-95"
              >
                <span className="text-sm font-bold font-bengali">{item}</span>
                <button 
                  onClick={() => handleDeleteItem(item, collectionName)}
                  className="p-1 hover:text-red-500 transition-colors"
                  aria-label="Delete item"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest py-2">এখনো কিছু যোগ করা হয়নি</p>
          )}
        </div>
      </div>
    </Card>
  );

  // Authentication & Access Check
  const normalizedRole = normalizeRole(userData?.role);
  const isAuthorized = normalizedRole === "institute_admin" || normalizedRole === "super_admin";
  
  if (authLoading || (loading && !tenant)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-black text-red-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 max-w-xs font-bengali">এই পৃষ্ঠাটি দেখার জন্য উপযুক্ত পারমিশন আপনার নেই।</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Settings className="w-7 h-7 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali tracking-tight">সিস্টেম কনফিগারেশন</h1>
            <p className="text-sm text-gray-500 font-medium font-bengali">প্রতিষ্ঠান সেটিংস এবং ডাটা ম্যানেজমেন্ট</p>
          </div>
        </div>
      </div>

      {/* Main Settings Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 grow pb-10">
        
        {/* General Institute Info Form */}
        <div className="lg:col-span-1">
          <Card title="প্রতিষ্ঠান সাধারণ তথ্য" icon={Settings} className="h-full">
            <form onSubmit={handleSaveGeneralInfo} className="space-y-6">
               <div className="space-y-4">
                  <InputGroup 
                    label="প্রতিষ্ঠানের নাম (বাংলা)" 
                    value={generalInfo.nameBN} 
                    onChange={(v: string) => setGeneralInfo(p => ({ ...p, nameBN: v }))} 
                    placeholder="উদা: আমাদের স্কুল ও কলেজ"
                  />
                  <InputGroup 
                    label="Institute Name (English)" 
                    value={generalInfo.name} 
                    onChange={(v: string) => setGeneralInfo(p => ({ ...p, name: v }))} 
                    placeholder="e.g. Our School & College"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup 
                      label="EIIN" 
                      value={generalInfo.eiin} 
                      onChange={(v: string) => setGeneralInfo(p => ({ ...p, eiin: v }))} 
                      placeholder="EIIN Number"
                    />
                    <InputGroup 
                      label="Sheet ID" 
                      value={generalInfo.googleSheetId} 
                      onChange={(v: string) => setGeneralInfo(p => ({ ...p, googleSheetId: v }))} 
                      placeholder="Spreadsheet ID"
                    />
                  </div>
                  <InputGroup 
                    label="ঠিকানা" 
                    value={generalInfo.address} 
                    onChange={(v: string) => setGeneralInfo(p => ({ ...p, address: v }))} 
                    placeholder="গ্রাম, ডাকঘর, থানা, জেলা"
                  />
                  <InputGroup 
                    label="মোবাইল ফোন" 
                    value={generalInfo.phone} 
                    onChange={(v: string) => setGeneralInfo(p => ({ ...p, phone: v }))} 
                    placeholder="০১৭XXXXXXXX"
                  />
                  <InputGroup 
                    label="ওয়েবসাইট (ঐচ্ছিক)" 
                    value={generalInfo.website} 
                    onChange={(v: string) => setGeneralInfo(p => ({ ...p, website: v }))} 
                    placeholder="https://institute.gov.bd"
                  />
               </div>

               <button 
                  type="submit"
                  disabled={savingGeneral}
                  className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
               >
                  {savingGeneral ? <Loader2 className="w-5 h-5 animate-spin" /> : "সেভ করুন"}
               </button>
            </form>
          </Card>
        </div>

        {/* Data Lists Management */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Classes Manager */}
          <SettingsSection 
            title="ক্লাস (Classes)" 
            icon={GraduationCap} 
            field="class" 
            collectionName="classes"
            placeholder="ক্লাসের নাম লিখুন (উদা: Class 10)"
            items={tenant?.classes || []}
          />

        {/* Departments Manager */}
        <SettingsSection 
          title="বিভাগ / গ্রুপ (Departments)" 
          icon={Layers} 
          field="department" 
          collectionName="departments"
          placeholder="বিভাগের নাম লিখুন (উদা: Science)"
          items={tenant?.departments || []}
        />

        {/* Sessions Manager */}
        <SettingsSection 
          title="সেশন (Sessions)" 
          icon={Calendar} 
          field="session" 
          collectionName="sessions"
          placeholder="সেশন লিখুন (উদা: 2024-2025)"
          items={tenant?.sessions || []}
        />

        {/* Shifts Manager */}
        <SettingsSection 
          title="শিফট (Shifts)" 
          icon={Clock} 
          field="shift" 
          collectionName="shifts"
          placeholder="শিফট লিখুন (উদা: Morning)"
          items={tenant?.shifts || []}
        />

      </div>
    </div>

      {/* Instructional / Guidance Card */}
      <div className="bg-white border border-purple-100 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-bottom-2 duration-1000">
        <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center shrink-0">
          <ShieldAlert className="w-8 h-8 text-[#6f42c1]" />
        </div>
        <div className="space-y-2 text-center md:text-left">
          <h4 className="text-base font-black text-gray-900 font-bengali">প্রয়োজনীয় গাইডলাইন</h4>
          <p className="text-sm text-gray-600 leading-relaxed font-bengali font-medium">
            এখানে যুক্ত করা তথ্যগুলো শিক্ষার্থী এবং শিক্ষক নিবন্ধনের সময় ড্রপডাউন মেন্যুতে প্রদর্শিত হবে। 
            নতুন ডেটা যুক্ত করার পর সেটি মুছতে চাইলে আইটেমের পাশে থাকা ছোট্ট 'X' চিহ্নে ক্লিক করুন। 
            সেশন বা শিফট পরিবর্তনের পর ডাটাবেজ আপডেট হতে কয়েক সেকেন্ড সময় নিতে পারে।
          </p>
        </div>
      </div>

      {/* Bottom Spacer for Mobile Nav */}
      <div className="h-10 lg:hidden" />
    </div>
  );
}

/** Helper Components */

function InputGroup({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bengali"
      />
    </div>
  );
}

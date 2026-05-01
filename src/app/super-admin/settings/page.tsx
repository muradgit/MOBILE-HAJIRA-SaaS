"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { 
  Settings, 
  Save, 
  ShieldAlert, 
  Loader2, 
  Coins, 
  UserPlus, 
  LogIn, 
  QrCode, 
  CreditCard 
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - System Settings Page
 * Controls global parameters, pricing, and active modules for the entire SaaS.
 */
export default function SystemSettings() {
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initial Settings State
  const [settings, setSettings] = useState({
    registration_bonus: 100,
    attendance_cost: 2,
    sms_cost: 0.50,
    allow_teacher_registration: true,
    allow_student_registration: true,
    login_google: true,
    login_email: true,
    login_sms: false,
    module_qr: true,
    module_manual: true,
    module_student_code: true,
    module_face: false,
    payment_manual: true,
    payment_auto: false,
  });

  // Fetch Settings on Load
  useEffect(() => {
    if (userData?.role !== "super_admin") return;

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "system_settings", "global");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("সেটিংস লোড করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userData]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("সেটিংস সেভ হচ্ছে...");

    try {
      const docRef = doc(db, "system_settings", "global");
      await setDoc(docRef, {
        ...settings,
        updated_at: new Date().toISOString(),
        updated_by: userData?.user_id
      }, { merge: true });

      toast.success("সিস্টেম সেটিংস সফলভাবে সেভ হয়েছে", { id: toastId });
    } catch (error: any) {
      toast.error("সেভ ব্যর্থ: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Helper for Toggle rendering
  const Toggle = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string, 
    value: boolean, 
    onChange: (val: boolean) => void 
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-[#6f42c1] focus:ring-offset-2",
          value ? "bg-[#6f42c1]" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );

  // Auth Protection
  if (authLoading || loading) return (
    <div className="flex h-screen items-center justify-center">
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

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali">সিস্টেম সেটিংস</h1>
            <p className="text-sm text-gray-500">গ্লোবাল প্যারামিটার ও মডিউল কন্ট্রোল</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-[#6f42c1] text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          সেটিংস সেভ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credit & Pricing */}
        <Card title="ক্রেডিট ও প্রাইস" icon={Coins}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reg. Bonus Credit</label>
              <input 
                type="number"
                value={settings.registration_bonus}
                onChange={(e) => setSettings({...settings, registration_bonus: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Attendance Cost (Credits)</label>
              <input 
                type="number"
                step="0.1"
                value={settings.attendance_cost}
                onChange={(e) => setSettings({...settings, attendance_cost: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">SMS Cost (Credits)</label>
              <input 
                type="number"
                step="0.1"
                value={settings.sms_cost}
                onChange={(e) => setSettings({...settings, sms_cost: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Registration Control */}
        <Card title="রেজিস্ট্রেশন কন্ট্রোল" icon={UserPlus}>
          <div className="divide-y divide-gray-50">
            <Toggle 
              label="টিচার রেজিস্ট্রেশন চালু" 
              value={settings.allow_teacher_registration}
              onChange={(v) => setSettings({...settings, allow_teacher_registration: v})}
            />
            <Toggle 
              label="স্টুডেন্ট রেজিস্ট্রেশন চালু" 
              value={settings.allow_student_registration}
              onChange={(v) => setSettings({...settings, allow_student_registration: v})}
            />
          </div>
        </Card>

        {/* Login Methods */}
        <Card title="লগইন মেথড" icon={LogIn}>
          <div className="divide-y divide-gray-50">
            <Toggle 
              label="Google Login" 
              value={settings.login_google}
              onChange={(v) => setSettings({...settings, login_google: v})}
            />
            <Toggle 
              label="Email & Password" 
              value={settings.login_email}
              onChange={(v) => setSettings({...settings, login_email: v})}
            />
            <Toggle 
              label="SMS Verification" 
              value={settings.login_sms}
              onChange={(v) => setSettings({...settings, login_sms: v})}
            />
          </div>
        </Card>

        {/* Attendance Modules */}
        <Card title="হাজিরা পদ্ধতি" icon={QrCode}>
          <div className="divide-y divide-gray-50">
            <Toggle 
              label="QR Code Scan" 
              value={settings.module_qr}
              onChange={(v) => setSettings({...settings, module_qr: v})}
            />
            <Toggle 
              label="Manual Checkbox" 
              value={settings.module_manual}
              onChange={(v) => setSettings({...settings, module_manual: v})}
            />
            <Toggle 
              label="Student Panel Code" 
              value={settings.module_student_code}
              onChange={(v) => setSettings({...settings, module_student_code: v})}
            />
            <Toggle 
              label="Face Scan (AI)" 
              value={settings.module_face}
              onChange={(v) => setSettings({...settings, module_face: v})}
            />
          </div>
        </Card>

        {/* Payment Gateways */}
        <Card title="পেমেন্ট মেথড" icon={CreditCard}>
          <div className="divide-y divide-gray-50">
            <Toggle 
              label="Manual (Macrodroid)" 
              value={settings.payment_manual}
              onChange={(v) => setSettings({...settings, payment_manual: v})}
            />
            <Toggle 
              label="Auto Gateway (API)" 
              value={settings.payment_auto}
              onChange={(v) => setSettings({...settings, payment_auto: v})}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

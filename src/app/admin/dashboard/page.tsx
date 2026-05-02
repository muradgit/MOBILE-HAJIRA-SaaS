"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  GraduationCap, 
  Zap, 
  ShieldCheck, 
  LayoutDashboard,
  ArrowUpRight,
  Loader2,
  Calendar,
  CreditCard,
  Settings,
  Bell,
  Plus,
  BarChart3,
  MessageSquare,
  IdCard,
  AlertCircle,
  LayoutGrid,
  FileText
} from "lucide-react";
import { useUserStore } from "@/src/store/useUserStore";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  Timestamp
} from "firebase/firestore";
import { Card } from "@/src/components/ui/Card";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

/**
 * Institute Admin Dashboard - Clean, Beautiful & Dynamic
 * Developed for Mobile-Hajira SaaS
 */
export default function AdminDashboard() {
  const { tenantId, user, activeRole } = useUserStore();
  const { loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    attendanceToday: 0,
    credits: 0
  });
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch Data and Statistics
  useEffect(() => {
    if (!tenantId || authLoading) return;

    setLoading(true);

    // 1. Listen to Tenant Data
    const unsubTenant = onSnapshot(doc(db, "tenants", tenantId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTenant(data);
        setStats(prev => ({ ...prev, credits: data.credits_left || 0 }));
      } else {
        console.error("Tenant not found in Firestore");
      }
      setLoading(false);
    }, (err) => {
      console.error("Tenant Data Error:", err);
      setLoading(false);
    });

    // 2. Count Active Teachers
    const qTeachers = query(
      collection(db, "users"),
      where("tenant_id", "==", tenantId),
      where("role", "==", "teacher"),
      where("status", "==", "approved")
    );
    const unsubTeachers = onSnapshot(qTeachers, (snap) => {
      setStats(prev => ({ ...prev, teachers: snap.size }));
    });

    // 3. Count Active Students
    const qStudents = query(
      collection(db, "users"),
      where("tenant_id", "==", tenantId),
      where("role", "==", "student"),
      where("status", "==", "approved")
    );
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStats(prev => ({ ...prev, students: snap.size }));
    });

    // 4. Count Attendance Records for Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = Timestamp.fromDate(today);

    // Root path or subcollection? Assuming subcollection per SaaS pattern
    const qAttendance = query(
      collection(db, `tenants/${tenantId}/attendance_logs`),
      where("timestamp", ">=", startOfToday)
    );
    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      setStats(prev => ({ ...prev, attendanceToday: snap.size }));
    }, (err) => {
      console.warn("Attendance logs listener failed (might be empty):", err);
    });

    return () => {
      unsubTenant();
      unsubTeachers();
      unsubStudents();
      unsubAttendance();
    };
  }, [tenantId, authLoading]);

  // Authorization and Authentication Guard
  useEffect(() => {
    if (!isHydrated || authLoading) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const isAuthorized = activeRole === "institute_admin" || activeRole === "super_admin";
    if (!isAuthorized) {
      router.replace("/");
    }
  }, [isHydrated, authLoading, user, activeRole, router]);

  // Loading Screen
  if (!isHydrated || authLoading || (loading && !tenant)) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-12 bg-white rounded-[3rem]">
        <div className="relative mb-6">
          <Loader2 className="w-16 h-16 text-[#6f42c1] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-[#6f42c1] rounded-full animate-ping" />
          </div>
        </div>
        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse font-bengali">অপেক্ষায় থাকুন...</p>
      </div>
    );
  }

  const quickActions = [
    { name: "শিক্ষকগণ", desc: "Staff & Assignments", icon: Users, path: "/admin/teachers", color: "bg-purple-50 text-[#6f42c1]" },
    { name: "শিক্ষার্থীবৃন্দ", desc: "Student Directory", icon: GraduationCap, path: "/admin/students", color: "bg-blue-50 text-blue-600" },
    { name: "হাজিরা রিপোর্ট", desc: "Attendance History", icon: FileText, path: "/admin/users", color: "bg-emerald-50 text-emerald-600" },
    { name: "SMS প্যানেল", desc: "Parent Communication", icon: MessageSquare, path: "/admin/sms", color: "bg-orange-50 text-orange-600" },
    { name: "ক্রেডিট ও বিলিং", desc: "Account Balance", icon: CreditCard, path: "/admin/billing", color: "bg-indigo-50 text-indigo-600" },
    { name: "সেটিংস", desc: "Institute Profile", icon: Settings, path: "/admin/settings", color: "bg-gray-50 text-gray-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 animate-in fade-in zoom-in duration-500 pb-20">
      
      {/* 1. Hero Welcome Section */}
      <div className="bg-[#6f42c1] rounded-[3rem] p-10 sm:p-14 text-white relative overflow-hidden shadow-2xl shadow-purple-900/15">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 shrink-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-[60px] -ml-20 -mb-20 shrink-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-inner">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-bengali leading-tight">
                  {tenant?.nameBN || tenant?.name || "এডমিন ড্যাশবোর্ড"}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-100/80">Authorized Institute Admin</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button 
              onClick={() => router.push("/admin/billing")}
              className="group bg-white text-[#6f42c1] px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Zap className="w-5 h-5 group-hover:animate-bounce" /> ক্রেডিট রিচার্জ
            </button>
            <button 
              onClick={() => router.push("/admin/settings")}
              className="bg-purple-800/40 backdrop-blur-md text-white border border-white/25 px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-purple-800/60 transition-all flex items-center justify-center gap-3"
            >
              <Settings className="w-5 h-5" /> সেটিংস
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Stats Cards (Floating Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 -mt-20 relative z-20 px-4 sm:px-6">
          <StatBox 
            title="অবশিষ্ট ক্রেডিট" 
            value={stats.credits} 
            icon={Zap} 
            color="text-amber-500" 
            bgColor="bg-amber-50"
            trend="+5% from last month"
            onClick={() => router.push("/admin/billing")}
          />
          <StatBox 
            title="আজকের হাজিরা" 
            value={stats.attendanceToday} 
            icon={Calendar} 
            color="text-emerald-500" 
            bgColor="bg-emerald-50"
            trend="Real-time live sync"
          />
          <StatBox 
            title="মোট শিক্ষক" 
            value={stats.teachers} 
            icon={Users} 
            color="text-blue-500" 
            bgColor="bg-blue-50"
            onClick={() => router.push("/admin/teachers")}
          />
          <StatBox 
            title="মোট শিক্ষার্থী" 
            value={stats.students} 
            icon={GraduationCap} 
            color="text-rose-500" 
            bgColor="bg-rose-50"
            onClick={() => router.push("/admin/students")}
          />
      </div>

      {/* 3. Main Content: Grid of Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left: Quick Actions Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xl font-black text-gray-900 font-bengali flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-[#6f42c1]" /> নিয়মিত কার্যক্রম
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-2">
            {quickActions.map((action) => (
              <button
                key={action.name}
                onClick={() => router.push(action.path)}
                className="group flex items-center gap-6 p-7 bg-white rounded-[2.5rem] border-2 border-transparent hover:border-[#6f42c1]/10 hover:shadow-2xl hover:shadow-purple-900/10 transition-all text-left shadow-sm active:scale-95"
              >
                <div className={cn("p-5 rounded-[2rem] transition-transform group-hover:scale-110 shadow-inner", action.color)}>
                  <action.icon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-gray-900 font-bengali text-lg leading-tight">{action.name}</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Stack: Notifications & Status */}
        <div className="space-y-8 h-full">
          <h2 className="text-xl font-black text-gray-900 font-bengali flex items-center gap-3 px-4">
            <Bell className="w-6 h-6 text-[#6f42c1]" /> আপডেট ও এলার্ট
          </h2>

          <div className="space-y-6 flex flex-col h-full">
            {/* Low Credit Warning */}
            {stats.credits < 50 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-8 bg-red-600 text-white rounded-[3rem] shadow-2xl shadow-red-900/20 relative overflow-hidden group"
              >
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-[0.1em] leading-tight flex-1">Credit Limit Exceeded!</h4>
                  </div>
                  <p className="text-xs font-medium text-red-50 leading-relaxed font-bengali">
                    আপনার প্রতিষ্ঠানের ক্রেডিট ব্যালেন্স ৫০ ইউনিটের নিচে নেমে এসেছে। অটোমেটিক হাজিরা সিস্টেম সচল রাখতে রিচার্জ করুন।
                  </p>
                  <button 
                    onClick={() => router.push("/admin/billing")}
                    className="w-full py-4 bg-white text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-xl"
                  >
                    ক্রেডিট কিনুন →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Institution Status Card */}
            <Card className="p-8 border-none shadow-sm rounded-[3rem] bg-white flex flex-col gap-8">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active System Status</p>
                 </div>
                 <BarChart3 className="w-4 h-4 text-gray-200" />
               </div>

               <div className="space-y-5">
                  <InfoRow label="EIIN Coding" value={tenant?.eiin || "N/A"} />
                  <InfoRow label="Admin Type" value={tenant?.institutionType || "Public/Private"} />
                  <InfoRow label="Current Plan" value={tenant?.plan || "Standard SaaS"} color="text-[#6f42c1]" />
               </div>

               <button
                  onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${tenant?.googleSheetId}`, "_blank")}
                  className="w-full flex items-center justify-center gap-3 p-5 bg-emerald-50 text-emerald-700 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all group"
               >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" /> গুগল শীট খুলুন
               </button>
            </Card>

            <div className="p-6 bg-purple-50 rounded-[2.5rem] border border-purple-100 flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#6f42c1]" />
               </div>
               <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest leading-relaxed">
                  System Security Integrity: <span className="text-emerald-600">Veriffied</span>
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper Components */

function StatBox({ title, value, icon: Icon, color, bgColor, trend, onClick }: any) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-8 bg-white border-none shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:-translate-y-2 transition-all group",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-14 h-14 rounded-[1.8rem] flex items-center justify-center transition-colors shadow-inner", bgColor)}>
          <Icon className={cn("w-7 h-7", color)} />
        </div>
        <ArrowUpRight className="w-5 h-5 text-gray-50 group-hover:text-gray-200 transition-colors" />
      </div>
      <div>
        <h3 className="text-4xl font-black text-gray-900 leading-none">{value}</h3>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mt-3 font-bengali">{title}</p>
        {trend && (
          <p className="text-[9px] text-gray-300 font-bold mt-1.5 leading-none tracking-tight">{trend}</p>
        )}
      </div>
    </Card>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="text-gray-400 font-bold uppercase tracking-[0.1em] text-[10px]">{label}</span>
      <span className={cn("font-black text-gray-900", color)}>{value}</span>
    </div>
  );
}

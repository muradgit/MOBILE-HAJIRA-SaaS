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
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  collectionGroup,
  where,
  getDocs
} from "firebase/firestore";
import { Tenant, UserData, Broadcast, Payment } from "@/src/lib/types";
import { Card } from "@/src/components/ui/Card";
import { normalizeRole } from "@/src/lib/auth-utils";
import { 
  Database, 
  Users, 
  Wallet as WalletIcon,
  Loader2,
  Megaphone,
  Youtube,
  Send,
  Building2,
  Clock,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Coins,
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Activity,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

export default function SuperAdminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Dashboard Data State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    video_url: "",
    target_role: "All" as "All" | "institute_admin" | "teacher" | "student"
  });
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);

  // Credit Top-up State
  const [selectedTenantForCredit, setSelectedTenantForCredit] = useState<Tenant | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Load Dashboard Data
  useEffect(() => {
    if (!userData || normalizeRole(userData.role) !== "super_admin") return;
    
    setLoading(true);
    setError(null);

    const handleError = (err: any) => {
      console.error("Dashboard Fetch Error:", err);
      // Don't show full screen error, just a toast if it's a minor query failure
      if (err.message?.includes("index")) {
        console.warn("Missing index on dashboard query. Check console for URL.");
      }
    };

    // 1. Tenants Snapshot
    const unsubTenants = onSnapshot(
      query(collection(db, "tenants"), orderBy("name", "asc")), 
      (snapshot) => {
        setTenants(snapshot.docs.map(doc => doc.data() as Tenant).filter(t => t.tenant_id !== "SUPER_ADMIN_TENANT"));
      },
      handleError
    );

    // 2. Users Snapshot
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), limit(1000)), 
      (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserData));
        setLoading(false);
      },
      handleError
    );

    // 3. Payments Snapshot
    const unsubPayments = onSnapshot(
      query(collection(db, "payments"), orderBy("created_at", "desc"), limit(5)), 
      (snapshot) => {
        setRecentPayments(snapshot.docs.map(doc => ({ payment_id: doc.id, ...doc.data() } as Payment)));
      }
    );

    // 4. Global Broadcasts
    const unsubBroadcasts = onSnapshot(
      query(collection(db, "broadcasts"), orderBy("created_at", "desc"), limit(5)), 
      (snapshot) => {
        setRecentBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast)));
      }
    );

    // 5. Today's Attendance (Approximate via Collection Group)
    // NOTE: This might fail without index, so we wrap it
    const fetchTodayAttendance = async () => {
       try {
         const today = new Date().toISOString().split('T')[0];
         const q = query(collectionGroup(db, "attendance_logs"), where("date", "==", today));
         const snap = await getDocs(q);
         let count = 0;
         snap.forEach(doc => {
            count += doc.data().stats?.present || 0;
         });
         setTodayAttendanceCount(count);
       } catch (e) {
         console.warn("Global attendance count requires index or failed:", e);
         setTodayAttendanceCount(0);
       }
    };
    fetchTodayAttendance();

    return () => {
      unsubTenants();
      unsubUsers();
      unsubPayments();
      unsubBroadcasts();
    };
  }, [userData]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;

    setSubmittingBroadcast(true);
    try {
      await addDoc(collection(db, "broadcasts"), {
        ...broadcastForm,
        created_at: new Date().toISOString(),
        created_by: userData?.user_id,
        server_timestamp: serverTimestamp()
      });
      toast.success("ব্রডকাস্ট সফলভাবে পাবলিশ হয়েছে!");
      setBroadcastForm({ title: "", message: "", video_url: "", target_role: "All" });
    } catch (error: any) {
      toast.error("ভুল হয়েছে: " + error.message);
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const handleTopUp = async () => {
    if (!selectedTenantForCredit) return;
    const toastId = toast.loading("ক্রেডিট টপ-আপ হচ্ছে...");
    try {
      const currentCredits = selectedTenantForCredit.credits_left || selectedTenantForCredit.credits || 0;
      await updateDoc(doc(db, "tenants", selectedTenantForCredit.tenant_id), {
        credits_left: currentCredits + topUpAmount,
        updatedAt: serverTimestamp()
      });
      
      await addDoc(collection(db, "credit_history"), {
        tenant_id: selectedTenantForCredit.tenant_id,
        amount: topUpAmount,
        type: "manual_injection",
        description: "Super Admin Manual Top-up",
        timestamp: serverTimestamp(),
        previous_balance: currentCredits,
        new_balance: currentCredits + topUpAmount
      });

      toast.success(`${selectedTenantForCredit.name} এ ${topUpAmount} ক্রেডিট যোগ হয়েছে`, { id: toastId });
      setIsTopUpModalOpen(false);
      setSelectedTenantForCredit(null);
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const toggleTenantStatus = async (tenant: Tenant) => {
    const newStatus = tenant.status === "active" ? "suspended" : "active";
    const toastId = toast.loading(`${newStatus === 'active' ? 'সক্রিয়' : 'স্থগিত'} করা হচ্ছে...`);
    try {
      await updateDoc(doc(db, "tenants", tenant.tenant_id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`প্রতিষ্ঠানটি সফলভাবে ${newStatus === 'active' ? 'সক্রিয়' : 'স্থগিত'} হয়েছে`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Auth Protection
  const isSuperAdmin = normalizeRole(userData?.role) === "super_admin";
  
  if (!authLoading && !isSuperAdmin) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldCheck className="w-16 h-16 text-rose-200" />
        <h2 className="text-2xl font-black text-rose-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 font-bold">এই পৃষ্ঠাটি আপনার জন্য উন্মুক্ত নয়।</p>
        <button onClick={() => router.push("/")} className="mt-4 bg-[#6f42c1] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20">ফিরে যান</button>
      </div>
    );
  }

  if (authLoading || (loading && !error)) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-white/50 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
            <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-purple-600" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse font-montserrat">Initializing System Command...</p>
        </div>
      </div>
    );
  }

  // Stats
  const activeTenantsCount = tenants.filter(t => t.status === "active").length;
  const teachersCount = allUsers.filter(u => u.role === "teacher").length;
  const studentsCount = allUsers.filter(u => u.role === "student").length;
  const totalSystemCredits = tenants.reduce((sum, t) => sum + (t.credits_left || t.credits || 0), 0);

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (t.eiin && t.eiin.includes(searchQuery));
    const matchesFilter = filterStatus === "all" ? true : t.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-8 space-y-10 max-w-7xl mx-auto pb-40">
      
      {/* 1. Powerful Control Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-gray-100 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-purple-600 text-white text-[8px] font-black rounded uppercase tracking-widest">Master Admin</div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Online</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 font-bengali tracking-tight">সিস্টেম ওভারভিউ ড্যাশবোর্ড</h1>
          <p className="text-sm font-bold text-gray-400">Total control over institutes, credits, and global broadcasts.</p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => router.push("/super-admin/institutes")}
             className="px-5 py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
           >
             <Building2 className="w-4 h-4" /> Manage Institutes
           </button>
        </div>
      </div>

      {/* 2. Global Performance Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative p-6 border-none bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden shadow-2xl">
          <div className="absolute right-0 bottom-0 opacity-10">
            <BarChart3 className="w-24 h-24" />
          </div>
          <TrendingUp className="w-5 h-5 text-purple-400 mb-6" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">মোট প্রতিষ্ঠান</p>
            <h3 className="text-4xl font-black">{tenants.length}</h3>
            <p className="text-[10px] font-bold text-emerald-400 mt-2">{activeTenantsCount} Active Institutions</p>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-100 shadow-xl shadow-gray-200/40 border-b-4 border-b-[#6f42c1]">
          <Activity className="w-6 h-6 text-[#6f42c1] mb-6" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">আজকের হাজিরা (মোট)</p>
            <h3 className="text-4xl font-black text-gray-900">{todayAttendanceCount ?? "---"}</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-2">Global Attendance Count</p>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-100 shadow-xl shadow-gray-200/40 border-b-4 border-b-blue-500">
          <Users className="w-6 h-6 text-blue-500 mb-6" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">মোট শিক্ষক / শিক্ষার্থী</p>
            <h3 className="text-3xl font-black text-gray-900">{teachersCount} <span className="text-gray-300 text-xl">/ {studentsCount}</span></h3>
            <p className="text-[10px] font-bold text-gray-400 mt-2">Active Users across System</p>
          </div>
        </Card>

        <Card className="p-6 bg-white border-gray-100 shadow-xl shadow-gray-200/40 border-b-4 border-b-amber-500">
          <Coins className="w-6 h-6 text-amber-500 mb-6" />
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">সিস্টেম ক্রেডিট ভলিউম</p>
            <h3 className="text-3xl font-black text-gray-900">{totalSystemCredits.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1">
               <WalletIcon className="w-3 h-3" /> Total Circulation in Marketplace
            </p>
          </div>
        </Card>
      </div>

      {/* 3. Operational Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Section (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-900" />
              <h2 className="text-xl font-black text-gray-900 font-bengali">প্রতিষ্ঠান লিস্ট ও কন্ট্রোল</h2>
            </div>
            <div className="flex items-center gap-2">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search EIIN or Name"
                    className="pl-10 pr-4 py-2 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#6f42c1] w-48"
                  />
               </div>
            </div>
          </div>

          <Card className="bg-white border-gray-100 shadow-xl shadow-gray-200/30 overflow-hidden rounded-[2.5rem]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-50">
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Institutions</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Credits</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTenants.slice(0, 10).map((t) => (
                    <tr key={t.tenant_id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#6f42c1] text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-purple-500/10">
                            {t.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 font-bengali">{t.nameBN || t.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">EIIN: {t.eiin} • {t.tenant_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em]",
                          t.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-black text-sm">
                         <span className={cn(
                           (t.credits_left || 0) < 50 ? "text-rose-500" : "text-[#6f42c1]"
                         )}>{t.credits_left || 0}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setSelectedTenantForCredit(t); setIsTopUpModalOpen(true); }}
                            className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                            title="Quick Top-up"
                          >
                            <Coins className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleTenantStatus(t)}
                            className={cn(
                              "p-2 rounded-xl transition-colors",
                              t.status === 'active' ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-gray-50 text-gray-400 hover:text-emerald-500"
                            )}
                          >
                            {t.status === 'active' ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button 
                             onClick={() => router.push(`/super-admin/institutes?edit=${t.tenant_id}`)}
                             className="p-2 bg-gray-50 text-gray-300 hover:text-[#6f42c1] rounded-xl"
                          >
                             <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-gray-400 italic">No institutions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {tenants.length > 10 && (
                <button 
                  onClick={() => router.push("/super-admin/institutes")}
                  className="w-full py-4 text-[10px] font-black uppercase text-gray-400 hover:bg-gray-50 hover:text-[#6f42c1] transition-all tracking-widest border-t border-gray-50"
                >
                  View All Institutions ({tenants.length})
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Section (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* Global Broadcast Form */}
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#6f42c1]" />
                <h2 className="text-xl font-black text-gray-900 font-bengali">ব্রডকাস্ট সেন্টার</h2>
              </div>
              <Card className="p-8 border-none bg-indigo-900 text-white shadow-2xl rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <form onSubmit={handleBroadcast} className="space-y-5 relative">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Broadcast Title</label>
                    <input 
                      required
                      value={broadcastForm.title}
                      onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})}
                      className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-white/20 outline-none focus:bg-white/20 transition-all font-bengali"
                      placeholder="জরুরি নোটিশ..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={broadcastForm.target_role}
                      onChange={e => setBroadcastForm({...broadcastForm, target_role: e.target.value as any})}
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:bg-white/20 appearance-none cursor-pointer"
                    >
                      <option value="All">Everyone</option>
                      <option value="institute_admin">Admins</option>
                      <option value="teacher">Teachers</option>
                      <option value="student">Students</option>
                    </select>
                    <input 
                      value={broadcastForm.video_url}
                      onChange={e => setBroadcastForm({...broadcastForm, video_url: e.target.value})}
                      className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 text-xs placeholder:text-white/20 outline-none focus:bg-white/20"
                      placeholder="YouTube Link"
                    />
                  </div>

                  <textarea 
                    required
                    value={broadcastForm.message}
                    onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})}
                    className="w-full bg-white/10 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold min-h-[140px] placeholder:text-white/20 outline-none focus:bg-white/20 transition-all font-bengali"
                    placeholder="বার্তা বিস্তারিত এখানে লিখুন..."
                  />

                  <button 
                    disabled={submittingBroadcast}
                    className="w-full bg-[#6f42c1] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {submittingBroadcast ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Broadcast Now
                  </button>
                </form>
              </Card>
           </div>

           {/* System Activity Summary */}
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">সাম্প্রতিক কার্যক্রম</h3>
                <Clock className="w-4 h-4 text-gray-300" />
              </div>
              
              <Card className="bg-white border-gray-100 shadow-sm rounded-[2rem] overflow-hidden divide-y divide-gray-50">
                {recentPayments.map(p => (
                  <div key={p.payment_id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                           <WalletIcon className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-gray-900">৳{p.amount.toLocaleString()} Recharge</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[100px]">{getTenantName(p.tenant_id, tenants)}</p>
                        </div>
                     </div>
                     <span className={cn(
                       "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                       p.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                     )}>{p.status}</span>
                  </div>
                ))}

                {recentBroadcasts.map(b => (
                  <div key={b.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                     <div className="flex items-center gap-3 text-indigo-500">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                           <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-gray-900 line-clamp-1">{b.title}</p>
                           <p className="text-[9px] font-black uppercase text-indigo-400">Broadcast sent</p>
                        </div>
                     </div>
                     <Clock className="w-3 h-3 text-gray-300" />
                  </div>
                ))}

                {recentPayments.length === 0 && recentBroadcasts.length === 0 && (
                  <div className="p-10 text-center text-xs text-gray-400 italic">Static or no activities yet.</div>
                )}
              </Card>
           </div>
           
        </div>

      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isTopUpModalOpen && selectedTenantForCredit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10 space-y-8"
             >
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                    <Coins className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-gray-900 font-bengali">ক্রেডিট রিচার্জ</h3>
                    <p className="text-xs font-bold text-gray-400">{selectedTenantForCredit.name} (EIIN: {selectedTenantForCredit.eiin})</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">পরিমাণ (Credits)</label>
                     <input 
                       type="number" 
                       value={topUpAmount}
                       onChange={e => setTopUpAmount(parseInt(e.target.value) || 0)}
                       className="w-full bg-gray-50 border-gray-100 rounded-2xl px-6 py-5 text-3xl font-black text-[#6f42c1] text-center focus:ring-4 focus:ring-purple-100 outline-none"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      {[100, 500, 1000, 5000].map(amt => (
                        <button key={amt} onClick={() => setTopUpAmount(amt)} className={cn("py-3 rounded-xl text-[10px] font-black transition-all", topUpAmount === amt ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>+{amt}</button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button onClick={handleTopUp} className="w-full bg-[#6f42c1] text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all">রিচার্জ নিশ্চিত করুন</button>
                   <button onClick={() => setIsTopUpModalOpen(false)} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">বাতিল করুন</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Utility
function getTenantName(id: string, tenants: Tenant[]) {
  const t = tenants.find(x => x.tenant_id === id);
  return t ? t.name : id;
}

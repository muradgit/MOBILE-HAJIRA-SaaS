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
  serverTimestamp 
} from "firebase/firestore";
import { Tenant, Transaction, UserData, Broadcast } from "@/src/lib/types";
import { Card } from "@/src/components/ui/Card";
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
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin Dashboard
 * Step 3.1: Dashboard Module
 * Features: Real-time stats, Global Broadcast System, and Recent Activities.
 * Optimized with robust error handling for missing indexes.
 */
export default function SuperAdminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  
  // Dashboard Data State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [recentBroadcasts, setRecentBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    video_url: "",
    target_role: "All" as "All" | "InstitutionAdmin" | "Teacher" | "Student"
  });
  const [submitting, setSubmitting] = useState(false);

  // Load Dashboard Data
  useEffect(() => {
    if (!userData || userData.role !== "SuperAdmin") return;
    
    setLoading(true);
    setError(null);

    const handleError = (err: any) => {
      console.error("Dashboard Fetch Error:", err);
      // Display a clear error message for missing indexes or permission issues
      setError("ডাটাবেজ ইনডেক্স তৈরি করা নেই বা পারমিশন এরর। দয়া করে ব্রাউজারের কনসোল (F12) চেক করুন।");
      setLoading(false);
    };

    // Real-time Tenants
    const unsubTenants = onSnapshot(
      query(collection(db, "tenants")), 
      (snapshot) => {
        setTenants(snapshot.docs.map(doc => doc.data() as Tenant).filter(t => t.tenant_id !== "SUPER_ADMIN_TENANT"));
      },
      handleError
    );

    // Real-time Transactions (Revenue)
    const unsubTransactions = onSnapshot(
      query(collection(db, "payments")), 
      (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), trx_id: doc.id } as unknown as Transaction)));
      },
      handleError
    );

    // Real-time Users
    const unsubUsers = onSnapshot(
      query(collection(db, "users")), 
      (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserData));
      },
      handleError
    );

    // Real-time Broadcasts (Last 5)
    const unsubBroadcasts = onSnapshot(
      query(collection(db, "broadcasts"), orderBy("created_at", "desc"), limit(5)), 
      (snapshot) => {
        setRecentBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Broadcast));
        setLoading(false); // Only set loading false when the final query (which depends on index) completes or fails
      },
      (err) => {
        handleError(err);
      }
    );

    // Fallback timer to ensure loading completes even if listeners hang or fail silently
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubTenants();
      unsubTransactions();
      unsubUsers();
      unsubBroadcasts();
      clearTimeout(timeout);
    };
  }, [userData]);

  // Handle Broadcast Submission
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) return;

    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  // Access Denied Screen (Authorization Check First)
  if (!authLoading && (!userData || userData.role !== "SuperAdmin")) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Database className="w-16 h-16 text-red-200" />
        <h2 className="text-2xl font-black text-red-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 max-w-xs">এই পৃষ্ঠাটি দেখার জন্য উপযুক্ত পারমিশন আপনার নেই।</p>
        <button 
          onClick={() => window.location.href = "/"}
          className="mt-4 bg-[#6f42c1] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
        >
          আমার ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    );
  }

  // Auth Protection & Loading Screen
  if (authLoading || (loading && !error)) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6 bg-white/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">ড্যাশবোর্ড লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Calculations
  const activeTenants = tenants.filter(t => t.status === "active").length;
  const suspendedTenants = tenants.length - activeTenants;
  const teachersCount = allUsers.filter(u => u.role === "Teacher").length;
  const studentsCount = allUsers.filter(u => u.role === "Student").length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-bengali">
            স্বাগতম, {userData?.nameBN || userData?.name} 👋
          </h1>
          <p className="text-sm text-gray-500 font-medium tracking-tight">Super Admin Dashboard • System Control Center</p>
        </div>
      </div>

      {/* Subtle Data Initialization Notice */}
      {error && (
        <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
          <AlertCircle className="w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-relaxed">
              সিস্টেম ডাটা ইনিশিয়ালাইজ হচ্ছে... সম্পূর্ণ তথ্য দেখতে কিছুক্ষণ অপেক্ষা করুন।
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-black uppercase text-[#6f42c1] hover:underline"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Part 1: Global Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-5 flex flex-col justify-between border-transparent bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-purple-500/20">
          <Database className="w-6 h-6 opacity-60 mb-4" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">মোট প্রতিষ্ঠান</p>
            <h3 className="text-3xl font-black">{tenants.length}</h3>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between hover:border-purple-200 transition-all border-purple-50">
          <Building2 className="w-6 h-6 text-purple-600 mb-4" />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">সক্রিয় / স্থগিত</p>
            <h3 className="text-2xl font-black text-gray-900">{activeTenants} <span className="text-gray-300 text-lg">/ {suspendedTenants}</span></h3>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between hover:border-purple-200 transition-all border-purple-50">
          <Users className="w-6 h-6 text-blue-600 mb-4" />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">শিক্ষক / শিক্ষার্থী</p>
            <h3 className="text-2xl font-black text-gray-900">{teachersCount} <span className="text-gray-300 text-lg">/ {studentsCount}</span></h3>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between hover:border-purple-200 transition-all border-purple-50">
          <WalletIcon className="w-6 h-6 text-emerald-600 mb-4" />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">মোট রেভিনিউ</p>
            <h3 className="text-2xl font-black text-gray-900">৳{totalRevenue.toLocaleString()}</h3>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Part 2: Broadcast/Notification System */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-black text-gray-900 font-bengali">গ্লোবাল ব্রডকাস্ট</h2>
          </div>

          <Card className="p-6 border-purple-50 shadow-sm">
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">শিরোনাম (Title)</label>
                <input 
                  required
                  value={broadcastForm.title}
                  onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="পেমেন্ট গেটওয়ে মেইনটেন্যান্স নোটিশ..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">টার্গেট রোল</label>
                  <select 
                    value={broadcastForm.target_role}
                    onChange={e => setBroadcastForm({...broadcastForm, target_role: e.target.value as any})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="All">All Users</option>
                    <option value="InstitutionAdmin">Admins Only</option>
                    <option value="Teacher">Teachers Only</option>
                    <option value="Student">Students Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ভিডিও লিংক (ঐচ্ছিক)</label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    <input 
                      value={broadcastForm.video_url}
                      onChange={e => setBroadcastForm({...broadcastForm, video_url: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="youtu.be/..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">বার্তা (Message)</label>
                <textarea 
                  required
                  value={broadcastForm.message}
                  onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="আপনার বার্তাটি এখানে লিখুন..."
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-purple-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                পাবলিশ করুন
              </button>
            </form>
          </Card>
        </div>

        {/* Part 3: Recent Activities */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-black text-gray-900 font-bengali">সাম্প্রতিক অ্যাক্টিভিটি</h2>
            </div>
            <button className="text-[10px] font-black uppercase text-purple-600 tracking-widest hover:underline flex items-center gap-1">
              সব দেখুন <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            <Card className="overflow-hidden border-transparent shadow-sm">
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">নতুন নিবন্ধিত প্রতিষ্ঠান</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {tenants.slice(0, 5).map((t) => (
                    <div key={t.tenant_id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{t.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-mono">EIIN: {t.eiin}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        t.status === "active" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                      )}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {tenants.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-400 italic text-sm">কোন প্রতিষ্ঠান পাওয়া যায়নি</div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-transparent shadow-sm">
              <div className="bg-white">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">সাম্প্রতিক ব্রডকাস্ট</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentBroadcasts.map((b) => (
                    <div key={b.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-gray-800 truncate mr-2">{b.title}</span>
                        <span className="text-[9px] font-black text-purple-500 uppercase bg-purple-50 px-1.5 py-0.5 rounded">
                          {b.target_role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{b.message}</p>
                    </div>
                  ))}
                  {recentBroadcasts.length === 0 && !loading && (
                    <div className="p-8 text-center text-gray-400 italic text-sm">কোন ব্রডকাস্ট নেই</div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

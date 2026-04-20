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
  updateDoc, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Loader2, 
  ShieldAlert, 
  Search,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { UserData } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Institute Admin - User Management Module
 * Steps 4.3 & 4.5: User Approval & Hybrid Image Policy
 * Features: Role-based tabs, real-time status updates, and graceful index error handling.
 */
export default function AdminUsersPage() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId: storeTenantId } = useUserStore();
  
  // States
  const [activeTab, setActiveTab] = useState<"Teacher" | "Student">("Teacher");
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [indexError, setIndexError] = useState(false);

  // 1. Resolve Active Tenant ID (Multi-layered Fallback)
  useEffect(() => {
    const resolveId = async () => {
      // Priority 1: Store
      if (storeTenantId) {
        setActiveTenantId(storeTenantId);
        return;
      }
      // Priority 2: useAuth cached data
      if (userData?.tenant_id) {
        setActiveTenantId(userData.tenant_id);
        return;
      }
      // Priority 3: Direct API fallback for edge-case reloads
      if (userData?.user_id) {
        try {
          const snap = await getDoc(doc(db, "users", userData.user_id));
          if (snap.exists() && snap.data()?.tenant_id) {
            setActiveTenantId(snap.data().tenant_id);
          }
        } catch (e) {
          console.error("Manual ID fallback failed", e);
        }
      }
    };
    if (!authLoading) resolveId();
  }, [storeTenantId, userData, authLoading]);

  // 2. Fetch Users with Index Error Handling
  useEffect(() => {
    if (!activeTenantId) return;

    setLoading(true);
    setIndexError(false);

    const usersRef = collection(db, "users");
    // This query might require a composite index if filtered by tenant_id AND role
    const q = query(
      usersRef, 
      where("tenant_id", "==", activeTenantId),
      where("role", "==", activeTab)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ user_id: d.id, ...d.data() }) as UserData);
      setUsers(data);
      setLoading(false);
    }, (error: any) => {
      setLoading(false);
      console.error("User Fetch Error:", error);
      // Catch missing index errors
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        setIndexError(true);
      } else {
        toast.error("ইউজার ডাটা আনতে সমস্যা হয়েছে");
      }
    });

    return () => unsub();
  }, [activeTenantId, activeTab]);

  // 3. User Status Handlers
  const handleUpdateStatus = async (targetUserId: string, newStatus: "approved" | "suspended") => {
    const toastId = toast.loading("স্ট্যাটাস আপডেট হচ্ছে...");
    try {
      await updateDoc(doc(db, "users", targetUserId), {
        status: newStatus
      });
      toast.success(newStatus === "approved" ? "ইউজার সফলভাবে সক্রিয় করা হয়েছে" : "ইউজার স্থগিত করা হয়েছে", { id: toastId });
    } catch (error: any) {
      toast.error("আপডেট ব্যর্থ হয়েছে: " + error.message, { id: toastId });
    }
  };

  // Filter logic
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.teacher_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auth Protection
  const isAuthorized = userData?.role === "InstitutionAdmin" || userData?.role === "SuperAdmin";

  if (authLoading || (loading && !activeTenantId)) {
    return (
      <div className="flex h-screen items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#6f42c1] animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing...</p>
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
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Users className="w-7 h-7 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali tracking-tight">ইউজার ম্যানেজমেন্ট</h1>
            <p className="text-sm text-gray-500 font-medium font-bengali">শিক্ষক ও শিক্ষার্থীদের তথ্য এবং অনুমোদন প্যানেল</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="নাম বা আইডি দিয়ে সার্চ করুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bengali shadow-sm"
          />
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-[1.5rem] w-full sm:w-fit">
        <button 
          onClick={() => setActiveTab("Teacher")}
          className={cn(
            "flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "Teacher" ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Users className="w-4 h-4" /> শিক্ষক
        </button>
        <button 
          onClick={() => setActiveTab("Student")}
          className={cn(
            "flex-1 sm:flex-none px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "Student" ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <GraduationCap className="w-4 h-4" /> শিক্ষার্থী
        </button>
      </div>

      {/* Index Error Warning */}
      {indexError && (
        <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-3xl flex items-center gap-3 animate-in fade-in zoom-in-95">
          <AlertCircle className="w-5 h-5 text-purple-400" />
          <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-relaxed">
            ডাটাবেজ ইনডেক্স তৈরি করা নেই। দয়া করে ব্রাউজারের কনসোল (F12) চেক করে রিকোয়ার্ড ইনডেক্স লিংকে ক্লিক করুন।
          </p>
        </div>
      )}

      {/* Main List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-gray-300">
             <Loader2 className="w-10 h-10 animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">Loading Users State...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.user_id}
              className="bg-white border border-gray-50 p-5 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative"
            >
              {/* Background Accent */}
              <div className={cn(
                "absolute top-0 left-0 w-2 h-full",
                user.status === "approved" ? "bg-green-500" : (user.status === "pending" ? "bg-amber-500" : "bg-red-500")
              )} />

              {/* Profile Info */}
              <div className="flex items-center gap-5 flex-1 pl-4">
                {/* Hybrid Avatar */}
                <div className="w-16 h-16 shrink-0 rounded-2xl border-2 border-gray-50 p-0.5 bg-white shadow-sm overflow-hidden relative">
                   {user.profile_image ? (
                     <img 
                       src={user.profile_image} 
                       alt={user.name} 
                       referrerPolicy="no-referrer"
                       className="w-full h-full object-cover rounded-xl"
                       onError={(e) => {
                         (e.currentTarget as any).src = ""; // Force fallback
                       }}
                     />
                   ) : (
                     <div className="w-full h-full bg-purple-50 text-[#6f42c1] flex items-center justify-center text-xl font-black">
                        {user.name?.charAt(0).toUpperCase()}
                     </div>
                   )}
                </div>

                <div className="space-y-1">
                   <h3 className="font-black text-gray-900 font-bengali text-lg leading-tight uppercase group-hover:text-[#6f42c1] transition-colors">
                     {user.nameBN || user.name}
                   </h3>
                   <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {user.email || user.phone || "No Contact"}</span>
                      {activeTab === "Student" && <span>ID: {user.student_id || "N/A"}</span>}
                      {activeTab === "Teacher" && <span>ID: {user.teacher_id || "N/A"}</span>}
                      {user.class && <span>Class: {user.class}</span>}
                   </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                <div className="flex flex-col items-end gap-1">
                   <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Current Status</p>
                   <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                    user.status === "approved" ? "bg-green-50 text-green-600" : 
                    (user.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                      user.status === "approved" ? "bg-green-600 animate-pulse" : 
                      (user.status === "pending" ? "bg-amber-600" : "bg-red-600")
                    )} />
                    {user.status || "pending"}
                  </span>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-10 bg-gray-100 hidden md:block" />

                <div className="flex items-center gap-2">
                   {user.status !== "approved" && (
                     <button 
                       onClick={() => handleUpdateStatus(user.user_id, "approved")}
                       className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all hover:scale-110 active:scale-95"
                       title="সক্রিয় করুন"
                     >
                       <UserCheck className="w-5 h-5" />
                     </button>
                   )}
                   {user.status !== "suspended" && (
                     <button 
                        onClick={() => handleUpdateStatus(user.user_id, "suspended")}
                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all hover:scale-110 active:scale-95"
                        title="স্থগিত করুন"
                     >
                       <UserX className="w-5 h-5" />
                     </button>
                   )}
                   <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-purple-50 hover:text-[#6f42c1] transition-all">
                      <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-10 h-10 text-gray-200" />
             </div>
             <p className="text-gray-400 font-bold font-bengali">কোন ইউজার পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Bottom Floating Stats / Guidance */}
      <div className="h-10 lg:hidden" />
    </div>
  );
}

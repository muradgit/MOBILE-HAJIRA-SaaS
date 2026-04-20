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
  AlertCircle,
  ArrowLeftRight,
  MoreVertical,
  Mail,
  Phone,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import { UserData } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Institute Admin - Advanced User Management Module
 * Step 4.5: User Approval, Hybrid Image Policy & Role Switching
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 1. Resolve Active Tenant ID
  useEffect(() => {
    const resolveId = async () => {
      if (storeTenantId) {
        setActiveTenantId(storeTenantId);
        return;
      }
      if (userData?.tenant_id) {
        setActiveTenantId(userData.tenant_id);
        return;
      }
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

  // 2. Fetch Users
  useEffect(() => {
    if (!activeTenantId) return;

    setLoading(true);
    setIndexError(false);

    const usersRef = collection(db, "users");
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
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        setIndexError(true);
      } else {
        toast.error("ইউজার ডাটা আনতে সমস্যা হয়েছে");
      }
    });

    return () => unsub();
  }, [activeTenantId, activeTab]);

  // 3. Status Update Handler
  const handleUpdateStatus = async (targetUserId: string, newStatus: "approved" | "suspended") => {
    const toastId = toast.loading("স্ট্যাটাস আপডেট হচ্ছে...");
    setOpenMenuId(null);
    try {
      await updateDoc(doc(db, "users", targetUserId), {
        status: newStatus
      });
      toast.success(newStatus === "approved" ? "ইউজার সফলভাবে সক্রিয় করা হয়েছে" : "ইউজার স্থগিত করা হয়েছে", { id: toastId });
    } catch (error: any) {
      toast.error("আপডেট ব্যর্থ হয়েছে: " + error.message, { id: toastId });
    }
  };

  // 4. Role Switch Handler
  const handleSwitchRole = async (targetUserId: string, newRole: "Teacher" | "Student" | "InstitutionAdmin") => {
    const confirm = window.confirm(`আপনি কি নিশ্চিতভাবে এই ইউজারের রোল পরিবর্তন করে "${newRole}" করতে চান?`);
    if (!confirm) return;

    const toastId = toast.loading("রোল পরিবর্তন হচ্ছে...");
    setOpenMenuId(null);
    try {
      const userRef = doc(db, "users", targetUserId);
      const updates: any = { role: newRole };
      
      // Clear specific IDs when role changes
      if (newRole === "Teacher") {
        updates.student_id = null;
        updates.teacher_id = updates.teacher_id || `T-${newRole.charAt(0)}${Math.floor(1000 + Math.random() * 9000)}`;
      } else if (newRole === "Student") {
        updates.teacher_id = null;
        updates.student_id = updates.student_id || `S-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      await updateDoc(userRef, updates);
      toast.success("রোল সফলভাবে পরিবর্তন করা হয়েছে", { id: toastId });
      
      // If switched to current tab role, list will refresh naturally via onSnapshot
      // If switched out of current tab, user will disappear from current view
    } catch (error: any) {
      toast.error("রোল পরিবর্তনে ব্যর্থ হয়েছে: " + error.message, { id: toastId });
    }
  };

  // Local filtering
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.nameBN?.includes(searchQuery) ||
    user.phone?.includes(searchQuery) ||
    user.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.teacher_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAuthorized = userData?.role === "InstitutionAdmin" || userData?.role === "SuperAdmin";

  if (authLoading || (loading && !activeTenantId)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#6f42c1] animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">ইউজার ডাটা প্রস্তুত হচ্ছে...</p>
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
    <div className="p-4 sm:p-2 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-200">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali tracking-tight">ইউজার ম্যানেজমেন্ট</h1>
            <p className="text-sm text-gray-500 font-medium font-bengali">শিক্ষক ও শিক্ষার্থীদের তথ্য, রোল এবং অনুমোদন প্যানেল</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
          <input 
            type="text"
            placeholder="নাম, ফোন বা আইডি দিয়ে সার্চ করুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all font-bengali shadow-sm"
          />
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-3xl w-full sm:w-fit font-bengali">
        <button 
          onClick={() => setActiveTab("Teacher")}
          className={cn(
            "flex-1 sm:flex-none px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "Teacher" ? "bg-white text-purple-600 shadow-md scale-[1.02]" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Users className="w-4 h-4" /> শিক্ষকবৃন্দ
        </button>
        <button 
          onClick={() => setActiveTab("Student")}
          className={cn(
            "flex-1 sm:flex-none px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "Student" ? "bg-white text-purple-600 shadow-md scale-[1.02]" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <GraduationCap className="w-4 h-4" /> শিক্ষার্থীবৃন্দ
        </button>
      </div>

      {/* Index Warning */}
      {indexError && (
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center gap-4 animate-bounce-subtle">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <p className="text-xs font-bold text-amber-700 font-bengali">
            ডাটাবেজ ইনডেক্স তৈরি করা নেই। পূর্ণাঙ্গ ফিল্টারিং কাজ করার জন্য ব্রাউজার কনসোলের লিংকে ক্লিক করে ইনডেক্সটি এনাবেল করুন।
          </p>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-24 flex flex-col items-center gap-4 text-gray-300">
             <Loader2 className="w-12 h-12 animate-spin text-purple-100" />
             <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Directory...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div 
              key={user.user_id}
              className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all group flex flex-col gap-6 relative overflow-hidden"
            >
              {/* Status Ribbon */}
              <div className={cn(
                "absolute top-0 right-0 px-6 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest",
                user.status === "approved" ? "bg-green-500 text-white" : 
                (user.status === "pending" ? "bg-amber-400 text-amber-900" : "bg-red-500 text-white")
              )}>
                {user.status || "Pending"}
              </div>

              {/* Profile Top Section */}
              <div className="flex items-start gap-5">
                {/* Hybrid Avatar Policy */}
                <div className="w-20 h-20 shrink-0 rounded-3xl border-4 border-gray-50 bg-white shadow-inner overflow-hidden relative group-hover:scale-105 transition-transform">
                   {user.profile_image ? (
                     <img 
                       src={user.profile_image} 
                       alt={user.name} 
                       referrerPolicy="no-referrer"
                       className="w-full h-full object-cover"
                       onError={(e) => {
                         (e.currentTarget as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f3e8ff&color=9333ea&bold=true`; 
                       }}
                     />
                   ) : (
                     <div className="w-full h-full bg-purple-50 text-purple-600 flex items-center justify-center text-2xl font-black">
                        {user.name?.charAt(0).toUpperCase()}
                     </div>
                   )}
                </div>

                <div className="flex-1 min-w-0 pt-2">
                   <h3 className="font-black text-gray-900 font-bengali text-lg leading-tight truncate group-hover:text-purple-600 transition-colors">
                     {user.nameBN || user.name}
                   </h3>
                   <p className="text-xs font-black text-purple-400 uppercase tracking-widest mt-1 mb-3">
                     {user.role}
                   </p>
                   {/* Unique ID Badge */}
                   <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-600 font-mono">
                        {user.role === "Student" ? (user.student_id || "NO-ID") : (user.teacher_id || "NO-ID")}
                      </span>
                   </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-gray-50/50 p-4 rounded-3xl border border-gray-50">
                 <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       <Mail className="w-2.5 h-2.5" /> Email
                    </div>
                    <p className="text-[11px] font-bold text-gray-700 truncate">{user.email || "No Email"}</p>
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       <Phone className="w-2.5 h-2.5" /> Mobile
                    </div>
                    <p className="text-[11px] font-bold text-gray-700">{user.phone || "No Phone"}</p>
                 </div>
                 {user.role === "Student" && (
                   <>
                     <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                           Class
                        </div>
                        <p className="text-[11px] font-bold text-gray-700">{user.class || "N/A"}</p>
                     </div>
                     <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                           Section
                        </div>
                        <p className="text-[11px] font-bold text-gray-700">{user.section || "N/A"}</p>
                     </div>
                   </>
                 )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 relative">
                <button 
                  onClick={() => setOpenMenuId(openMenuId === user.user_id ? null : user.user_id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    openMenuId === user.user_id ? "bg-purple-600 text-white shadow-lg" : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {openMenuId === user.user_id ? <ArrowLeftRight className="w-3 h-3" /> : <MoreVertical className="w-3 h-3" />}
                  অ্যাকশন মেন্যু
                </button>

                {/* Dropdown Menu */}
                {openMenuId === user.user_id && (
                  <div className="absolute bottom-full left-0 right-0 mb-3 bg-white border border-gray-100 rounded-3xl shadow-2xl py-3 z-10 animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-5 py-2 mb-2 border-b border-gray-50">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">User Controls</p>
                    </div>
                    {user.status !== "approved" && (
                      <button 
                        onClick={() => handleUpdateStatus(user.user_id, "approved")}
                        className="w-full px-5 py-3 text-left text-xs font-black text-green-600 hover:bg-green-50 flex items-center gap-3 transition-colors font-bengali"
                      >
                        <UserCheck className="w-4 h-4" /> অনুমোদন করুন
                      </button>
                    )}
                    {user.status !== "suspended" && (
                      <button 
                        onClick={() => handleUpdateStatus(user.user_id, "suspended")}
                        className="w-full px-5 py-3 text-left text-xs font-black text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-bengali"
                      >
                        <UserX className="w-4 h-4" /> স্থগিত (Suspend) করুন
                      </button>
                    )}
                    
                    <div className="px-5 py-2 my-2 border-t border-b border-gray-50 bg-gray-50/50">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Role Switching</p>
                    </div>

                    {user.role === "Student" && (
                       <button 
                         onClick={() => handleSwitchRole(user.user_id, "Teacher")}
                         className="w-full px-5 py-3 text-left text-xs font-black text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-colors font-bengali"
                       >
                         <ArrowLeftRight className="w-4 h-4" /> শিক্ষক হিসেবে পরিবর্তন (Promote)
                       </button>
                    )}
                    {user.role === "Teacher" && (
                       <>
                         <button 
                           onClick={() => handleSwitchRole(user.user_id, "Student")}
                           className="w-full px-5 py-3 text-left text-xs font-black text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors font-bengali"
                         >
                           <ArrowLeftRight className="w-4 h-4" /> শিক্ষার্থী হিসেবে পরিবর্তন
                         </button>
                         <button 
                           onClick={() => handleSwitchRole(user.user_id, "InstitutionAdmin")}
                           className="w-full px-5 py-3 text-left text-xs font-black text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 transition-colors font-bengali"
                         >
                           <ShieldAlert className="w-4 h-4" /> ইনস্টিটিউট এডমিন বানান
                         </button>
                       </>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => toast.info(`${user.nameBN || user.name} এর প্রোফাইল ডিটেইলস শীঘ্রই যুক্ত হবে।`)}
                  className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center space-y-6">
             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-gray-100/50 animate-pulse">
                <Users className="w-10 h-10 text-gray-200" />
             </div>
             <div className="space-y-2">
               <p className="text-gray-900 font-black font-bengali text-lg">কোন ডাটা পাওয়া যায়নি</p>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No users found in this category.</p>
             </div>
          </div>
        )}
      </div>

      {/* Stats Indicator */}
      <div className="fixed bottom-24 right-8 z-20 pointer-events-none sm:pointer-events-auto">
         <div className="bg-white border border-gray-100 p-4 rounded-3xl shadow-2xl flex items-center gap-4 transition-transform hover:scale-105">
            <div className="flex -space-x-3">
               {users.slice(0, 3).map((u, i) => (
                 <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[10px] font-black text-purple-600">
                    {u.name.charAt(0)}
                 </div>
               ))}
               {users.length > 3 && (
                 <div className="w-10 h-10 rounded-full border-2 border-white bg-purple-600 flex items-center justify-center text-[10px] font-black text-white">
                    +{users.length - 3}
                 </div>
               )}
            </div>
            <div className="pr-2">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">সক্রিয় ইউজার</p>
               <p className="text-sm font-black text-gray-900 leading-none">{users.length} জন</p>
            </div>
         </div>
      </div>
    </div>
  );
}


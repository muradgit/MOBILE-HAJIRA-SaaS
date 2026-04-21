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
  orderBy, 
  limit, 
  getDocs 
} from "firebase/firestore";
import { toast } from "sonner";
import { 
  Users, 
  ShieldAlert, 
  Loader2, 
  UserCheck, 
  UserX, 
  Mail,
  Building,
  AlertTriangle,
  ExternalLink 
} from "lucide-react";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { UserData, Tenant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - Global User Management Module
 * Allows Super Admin to oversee all users across all institutes.
 */
export default function UserManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form State for Editing
  const [formData, setFormData] = useState({
    role: "" as any,
    status: "" as any,
  });

  // 1. Fetch Tenants once to map IDs to Names
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    const fetchTenants = async () => {
      try {
        const q = query(collection(db, "tenants"));
        const snapshot = await getDocs(q);
        const mapping: Record<string, string> = { "SUPER_ADMIN": "System Owner" };
        snapshot.forEach(doc => {
          const data = doc.data() as Tenant;
          mapping[data.tenant_id] = data.name;
        });
        setTenantsMap(mapping);
      } catch (error) {
        console.error("Tenant Fetch Error:", error);
      }
    };

    fetchTenants();
  }, [userData]);

  // 2. Real-time Users Fetch (Batch of 100)
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    try {
      const q = query(
        collection(db, "users"), 
        orderBy("created_at", "desc"), 
        limit(100)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const usersData = snapshot.docs.map(doc => doc.data() as UserData);
          setUsers(usersData);
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
      console.error("Query Init Error:", err);
      setLoading(false);
    }
  }, [userData]);

  // 3. Handle Update User
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const toastId = toast.loading("ইউজার আপডেট হচ্ছে...");
    try {
      await updateDoc(doc(db, "users", selectedUser.user_id), {
        role: formData.role,
        status: formData.status
      });
      toast.success("ইউজার সফলভাবে আপডেট হয়েছে", { id: toastId });
      setIsDrawerOpen(false);
    } catch (error: any) {
      toast.error("আপডেট ব্যর্থ: " + error.message, { id: toastId });
    }
  };

  // 4. Quick Toggle Status
  const toggleStatus = async (user: UserData) => {
    const nextStatus = user.status === "approved" ? "suspended" : "approved";
    const toastId = toast.loading(`স্ট্যাটাস পরিবর্তন হচ্ছে...`);
    try {
      await updateDoc(doc(db, "users", user.user_id), { status: nextStatus });
      toast.success(`ইউজার এখন ${nextStatus}`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // Auth Protection
  if (authLoading) return (
    <div className="flex h-screen items-center justify-center">
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
      header: "ইউজার", 
      accessorKey: "name",
      cell: (item: UserData) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-[#6f42c1] font-black text-xs uppercase overflow-hidden border border-purple-100">
            {item.profile_image ? (
              <img src={item.profile_image} alt="" className="w-full h-full object-cover" />
            ) : (
              item.name.charAt(0)
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900">{item.name}</span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
              <Mail className="w-3 h-3" /> {item.email}
            </span>
          </div>
        </div>
      )
    },
    { 
      header: "রোল", 
      accessorKey: "role",
      cell: (item: UserData) => (
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
          item.role === "SuperAdmin" && "bg-purple-50 text-purple-600 border-purple-100",
          item.role === "InstitutionAdmin" && "bg-blue-50 text-blue-600 border-blue-100",
          item.role === "Teacher" && "bg-green-50 text-green-600 border-green-100",
          item.role === "Student" && "bg-orange-50 text-orange-600 border-orange-100"
        )}>
          {item.role === "InstitutionAdmin" ? "Inst Admin" : item.role}
        </span>
      )
    },
    { 
      header: "প্রতিষ্ঠান", 
      accessorKey: "tenant_id",
      cell: (item: UserData) => (
        <div className="flex items-center gap-1.5 text-gray-500 font-medium">
          <Building className="w-3.5 h-3.5 text-gray-300" />
          <span className="max-w-[150px] truncate">{tenantsMap[item.tenant_id] || "অজানা প্রতিষ্ঠান"}</span>
        </div>
      )
    },
    { 
      header: "স্ট্যাটাস", 
      accessorKey: "status",
      cell: (item: UserData) => (
        <span className={cn(
          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
          item.status === "approved" ? "bg-green-50 text-green-600" : 
          item.status === "pending" ? "bg-yellow-50 text-yellow-600" : 
          "bg-red-50 text-red-600"
        )}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
          <Users className="w-6 h-6 text-[#6f42c1]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-bengali">ইউজার ম্যানেজমেন্ট</h1>
          <p className="text-sm text-gray-500">প্ল্যাটফর্মের সকল প্রতিষ্ঠানের ইউজার লিস্ট এবং রোল কন্ট্রোল</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl p-2 sm:p-6 shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
            <p className="text-sm font-bold animate-pulse">ইউজার লিস্ট লোড হচ্ছে...</p>
          </div>
        ) : indexError ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <AlertTriangle className="w-16 h-16 text-orange-500" />
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900 font-bengali tracking-tight">ডাটাবেজ ইনডেক্স প্রয়োজন</h3>
                <p className="text-sm text-gray-500 font-medium">ইউজার লিস্ট দেখার জন্য আপনাকে একটি ফায়ারবেস ইনডেক্স তৈরি করতে হবে।</p>
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
            data={users}
            onEdit={(user) => {
              setSelectedUser(user);
              setFormData({ role: user.role, status: user.status || "pending" });
              setIsDrawerOpen(true);
            }}
            onDelete={(user) => toggleStatus(user)}
          />
        )}
      </div>

      {/* SlideOver Drawer for Editing */}
      <SlideOverForm 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title="ইউজার তথ্য এডিট"
      >
        {selectedUser && (
          <form onSubmit={handleUpdate} className="space-y-8">
            {/* Read-only User Info */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-[#6f42c1]">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight">{selectedUser.name}</h3>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Institution</p>
                <p className="text-sm font-bold text-gray-700">{tenantsMap[selectedUser.tenant_id] || "N/A"}</p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Change Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="SuperAdmin">SuperAdmin</option>
                  <option value="InstitutionAdmin">Institution Admin</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5" /> আপডেট নিশ্চিত করুন
            </button>

            <button 
              type="button"
              onClick={() => toggleStatus(selectedUser)}
              className={cn(
                "w-full py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
                selectedUser.status === "approved" 
                  ? "bg-red-50 text-red-500 border-red-100 hover:bg-red-100" 
                  : "bg-green-50 text-green-500 border-green-100 hover:bg-green-100"
              )}
            >
              {selectedUser.status === "approved" ? "Suspend Account" : "Activate Account"}
            </button>
          </form>
        )}
      </SlideOverForm>
    </div>
  );
}

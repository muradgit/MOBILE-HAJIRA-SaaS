"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { auth, db } from "@/src/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  orderBy, 
  limit, 
  getDocs,
  deleteDoc,
  setDoc,
  serverTimestamp 
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
  ExternalLink,
  Plus,
  Trash2 
} from "lucide-react";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { UserData, Tenant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

/**
 * Super Admin - Global User Management Module
 * Allows Super Admin to oversee and manage all users across all institutes.
 */
export default function UserManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Form State for Editing
  const [formData, setFormData] = useState({
    role: "" as any,
    status: "" as any,
  });

  // Form State for Creating
  const [createData, setCreateData] = useState({
    name: "",
    nameBN: "",
    identifier: "",
    password: "",
    role: "Teacher" as any,
    tenant_id: "",
    status: "approved" as any,
  });

  // 1. Fetch Tenants for Mapping and Selects
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    const fetchTenants = async () => {
      try {
        const q = query(collection(db, "tenants"), orderBy("name", "asc"));
        const snapshot = await getDocs(q);
        const data: Tenant[] = [];
        const mapping: Record<string, string> = { "SUPER_ADMIN": "System Owner" };
        
        snapshot.forEach(docSnap => {
          const t = docSnap.data() as Tenant;
          data.push(t);
          mapping[t.tenant_id] = t.name;
        });
        
        setTenants(data);
        setTenantsMap(mapping);
      } catch (error) {
        console.error("Tenant Fetch Error:", error);
      }
    };

    fetchTenants();
  }, [userData]);

  // 2. Real-time Users Fetch (Total Collection for SuperAdmin)
  useEffect(() => {
    if (userData?.role !== "SuperAdmin") return;

    try {
      // For SuperAdmin, we fetch everything across all tenants
      const q = query(
        collection(db, "users"), 
        orderBy("created_at", "desc"), 
        limit(500) // Increased limit for global view
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const usersData = snapshot.docs.map(doc => doc.data() as UserData);
          setUsers(usersData);
          setLoading(false);
          setIndexError(null);
        },
        (error) => {
          console.error("Firestore Users Error:", error);
          if (error.message.includes("index")) {
            const url = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
            setIndexError(url || "Index Required. Check console for URL.");
          } else {
            toast.error("ডাটা লোড করতে সমস্যা হয়েছে: " + error.message);
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

  // 4. Create New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("ইউজার তৈরি হচ্ছে...");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/users/manage", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: createData.tenant_id,
          role: createData.role,
          name: createData.name,
          identifier: createData.identifier,
          password: createData.password,
          extra_data: {
            nameBN: createData.nameBN,
            status: createData.status
          }
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "ইউজার তৈরি ব্যর্থ");

      toast.success("নতুন ইউজার তৈরি সফল হয়েছে", { id: toastId });
      setIsCreateDrawerOpen(false);
      setCreateData({ 
        name: "", 
        nameBN: "", 
        identifier: "", 
        password: "",
        role: "Teacher", 
        tenant_id: "", 
        status: "approved" 
      });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // 5. Hard Delete User
  const handleHardDelete = async (user: UserData) => {
    if (!confirm(`আপনি কি নিশ্চিত যে ${user.name} কে স্থায়ীভাবে সরিয়ে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে আনা যাবে না।`)) return;
    
    const toastId = toast.loading("ইউজার ডিলিট হচ্ছে...");
    try {
      await deleteDoc(doc(db, "users", user.user_id));
      toast.success("ইউজার স্থায়ীভাবে সরিয়ে ফেলা হয়েছে", { id: toastId });
    } catch (error: any) {
      toast.error("ডিলিট ব্যর্থ: " + error.message, { id: toastId });
    }
  };

  // 6. Quick Toggle Status
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
            <span className="font-bold text-gray-900 leading-none">{item.name}</span>
            <div className="text-[10px] text-gray-400 mt-1 flex flex-col gap-0.5 font-medium lowercase">
              <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {item.email}</span>
              {item.username && (
                <span className="text-purple-500 font-bold">@{item.username}</span>
              )}
            </div>
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
          <span className="max-w-[150px] truncate text-[11px] font-bold uppercase">{tenantsMap[item.tenant_id] || "অজানা প্রতিষ্ঠান"}</span>
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
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 font-bengali">ইউজার ম্যানেজমেন্ট</h1>
            <p className="text-sm text-gray-500">প্ল্যাটফর্মের সকল প্রতিষ্ঠানের ইউজার লিস্ট এবং রোল কন্ট্রোল</p>
          </div>
        </div>

        <button 
          onClick={() => setIsCreateDrawerOpen(true)}
          className="bg-[#6f42c1] text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> নতুন ইউজার তৈরি করুন
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl p-2 sm:p-6 shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
            <p className="text-sm font-bold animate-pulse uppercase tracking-widest">ইউজার লিস্ট লোড হচ্ছে...</p>
          </div>
        ) : indexError ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <AlertTriangle className="w-16 h-16 text-orange-500" />
             <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900 font-bengali tracking-tight">ডাটাবেজ ইনডেক্স প্রয়োজন</h3>
                <p className="text-sm text-gray-500 font-medium">ইউজার লিস্ট দেখার জন্য আপনাকে একটি ফায়ারবেস ইনডেক্স তৈরি করতে হবে।</p>
                <div className="bg-gray-50 p-4 rounded-xl text-xs font-mono text-gray-400 mt-2 max-w-lg mx-auto">Error: {indexError}</div>
             </div>
             <a 
               href={indexError?.startsWith("http") ? indexError : "#"} 
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
            onDelete={(user) => handleHardDelete(user)}
          />
        )}
      </div>

      {/* SlideOver Drawer for Creating New User */}
      <SlideOverForm 
        isOpen={isCreateDrawerOpen} 
        onClose={() => setIsCreateDrawerOpen(false)} 
        title="নতুন ইউজার তৈরি করুন"
      >
        <form onSubmit={handleCreateUser} className="space-y-6">
           <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name (EN)</label>
                <input required value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all" placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">নাম (বাংলা)</label>
                <input required value={createData.nameBN} onChange={e => setCreateData({...createData, nameBN: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bengali font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all" placeholder="নাম উল্লেখ করুন" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email or User ID</label>
                <input required value={createData.identifier} onChange={e => setCreateData({...createData, identifier: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all" placeholder="user@domain.com or unique_id" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input required type="password" value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all" placeholder="••••••••" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Role</label>
                <select value={createData.role} onChange={e => setCreateData({...createData, role: e.target.value as any})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all">
                   <option value="SuperAdmin">SuperAdmin</option>
                   <option value="InstitutionAdmin">Institution Admin</option>
                   <option value="Teacher">Teacher</option>
                   <option value="Student">Student</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tenant / Institution</label>
                <select value={createData.tenant_id} onChange={e => setCreateData({...createData, tenant_id: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#6f42c1] outline-none transition-all">
                   <option value="">System-wide (No Tenant)</option>
                   <option value="SUPER_ADMIN">System Global</option>
                   {tenants.map(t => (
                     <option key={t.tenant_id} value={t.tenant_id}>{t.name}</option>
                   ))}
                </select>
              </div>
           </div>
           <button type="submit" className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
              তৈরি করুন
           </button>
        </form>
      </SlideOverForm>

      {/* SlideOver Drawer for Editing Existing User */}
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
              onClick={() => handleHardDelete(selectedUser)}
              className="w-full py-4 rounded-2xl border border-red-100 bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-red-100 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> ইউজারকে চিরতরে মুছে ফেলুন
            </button>
          </form>
        )}
      </SlideOverForm>
    </div>
  );
}


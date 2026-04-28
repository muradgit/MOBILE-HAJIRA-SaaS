"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  UserPlus,
  Mail,
  Shield,
  Clock,
  ExternalLink
} from "lucide-react";
import { collection, query, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { toast } from "sonner";
import Image from "next/image";

interface Teacher {
  user_id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "deleted";
  created_at: string;
  role: string;
  photo_url?: string;
}

export default function TeachersPage() {
  const { user, tenantId } = useUserStore();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!tenantId) return;

    const q = query(
      collection(db, "tenants", tenantId, "teachers")
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data() as Teacher);
      setTeachers(docs.filter(t => t.status !== "deleted"));
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/users/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          role: "teacher",
          ...formData
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "শিক্ষক যোগ করতে ব্যর্থ হয়েছে");

      toast.success("শিক্ষককে প্রোফাইল সফলভাবে তৈরি করা হয়েছে।");
      setIsAdding(false);
      setFormData({ name: "", email: "", password: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`${teacher.name} কে মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/users/manage?tenant_id=${tenantId}&user_id=${teacher.user_id}&role=teacher`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("মুছে ফেলতে ব্যর্থ হয়েছে");
      toast.success("শিক্ষককে সফলভাবে মুছে ফেলা হয়েছে।");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      header: "শিক্ষকের তথ্য",
      accessorKey: "name",
      cell: (t: Teacher) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
            {t.photo_url ? (
              <Image src={t.photo_url} alt={t.name} width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Users className="w-5 h-5 text-purple-600" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">{t.name}</p>
            <p className="text-xs text-gray-500">{t.email}</p>
          </div>
        </div>
      )
    },
    {
      header: "স্ট্যাটাস",
      accessorKey: "status",
      cell: (t: Teacher) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit ${
          t.status === "approved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        }`}>
          {t.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {t.status === "approved" ? "Approved" : "Pending"}
        </span>
      )
    },
    {
      header: "যোগদানের তারিখ",
      accessorKey: "created_at",
      cell: (t: Teacher) => (
        <p className="text-xs text-gray-500 font-medium">
          {t.created_at ? new Date(t.created_at).toLocaleDateString("bn-BD") : "N/A"}
        </p>
      )
    },
    {
      header: "অ্যাকশন",
      accessorKey: "user_id",
      cell: (t: Teacher) => (
        <div className="flex items-center gap-2">
           <button 
             onClick={() => handleDelete(t)}
             className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      )
    }
  ];

  const filteredTeachers = teachers.filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-600" /> শিক্ষক ম্যানেজমেন্ট
          </h1>
          <p className="text-gray-500 font-medium font-bengali">প্রতিষ্ঠানের সকল শিক্ষকদের তথ্য ও প্রোফাইল নিয়ন্ত্রণ করুন।</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> শিক্ষক যোগ করুন
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 bg-purple-600 text-white relative overflow-hidden">
          <Users className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
          <p className="text-xs font-black uppercase tracking-widest opacity-80">মোট শিক্ষক</p>
          <h3 className="text-4xl font-black mt-1">{teachers.length}</h3>
        </Card>
        <Card className="p-6 bg-white border-2 border-green-100">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">অ্যাপ্রুভড</p>
          <h3 className="text-4xl font-black text-green-600 mt-1">
            {teachers.filter(t => t.status === "approved").length}
          </h3>
        </Card>
        <Card className="p-6 bg-white border-2 border-orange-100">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">পেন্ডিং</p>
          <h3 className="text-4xl font-black text-orange-500 mt-1">
            {teachers.filter(t => t.status === "pending").length}
          </h3>
        </Card>
      </div>

      {/* Main Table Section */}
      <Card className="overflow-hidden border-transparent shadow-2xl shadow-purple-500/5 rounded-[2rem]">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          {["all", "approved", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filter === f 
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" 
                : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              {f === "all" ? "সকল শিক্ষক" : f === "approved" ? "অ্যাপ্রুভড" : "পেন্ডিং"}
            </button>
          ))}
        </div>
        <DataTable 
          columns={columns} 
          data={filteredTeachers} 
          searchPlaceholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
        />
      </Card>

      {/* SlideOver Form */}
      <SlideOverForm
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="নতুন শিক্ষক যোগ করুন"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পুরো নাম</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-10 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-purple-600 transition-all font-bengali"
                  placeholder="যেমন: মোঃ রহিম উদ্দিন"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ইমেইল অ্যাড্রেস</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-10 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-purple-600 transition-all"
                  placeholder="name@institute.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পাসওয়ার্ড</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input 
                  required
                  type="password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-10 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-purple-600 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50"
          >
            {submitting ? "প্রসেসিং..." : <Plus className="w-5 h-5" />} শিক্ষক তৈরি করুন
          </button>
        </form>
      </SlideOverForm>
    </div>
  );
}

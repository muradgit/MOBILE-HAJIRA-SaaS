"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  GraduationCap,
  Mail,
  Smartphone,
  BookOpen,
  Filter,
  UserPlus
} from "lucide-react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db, auth } from "@/src/lib/firebase";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import Image from "next/image";

interface Student {
  user_id: string;
  student_id: string; // Numerical/Serial ID
  name: string;
  email: string;
  class: string;
  section: string;
  phone: string;
  status: "pending" | "approved" | "deleted";
  created_at: string;
  photo_url?: string;
}

export default function StudentsPage() {
  const { user, tenantId } = useUserStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterClass, setFilterClass] = useState("all");

// Form State
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    identifierType: "email" as "email" | "username",
    password: "", // Security: No hardcoded passwords
    class: "",
    section: "",
    phone: "",
    student_id: "",
  });

  useEffect(() => {
    if (!tenantId) return;

    const q = query(
      collection(db, "users"),
      where("tenant_id", "==", tenantId),
      where("role", "==", "student") // SSOT Role
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data() as Student);
      setStudents(docs.filter(s => s.status !== "deleted"));
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/admin/users/manage", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          role: "Student",
          name: formData.name,
          identifier: formData.identifier,
          identifierType: formData.identifierType,
          password: formData.password,
          extra_data: {
            class: formData.class,
            section: formData.section,
            phone: formData.phone,
            student_id: formData.student_id
          }
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "শিক্ষার্থী যোগ করতে ব্যর্থ হয়েছে");

      if (result.requiresRefresh) {
        await auth.currentUser?.getIdToken(true);
      }

      toast.success("শিক্ষার্থীর প্রোফাইল সফলভাবে তৈরি করা হয়েছে।");
      setIsAdding(false);
      setFormData({ name: "", identifier: "", identifierType: "email", password: "", class: "", section: "", phone: "", student_id: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`${student.name} কে মুছে ফেলতে চান?`)) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/users/manage?tenant_id=${tenantId}&user_id=${student.user_id}&role=student`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("মুছে ফেলতে ব্যর্থ হয়েছে");
      toast.success("শিক্ষার্থীকে সফলভাবে মুছে ফেলা হয়েছে।");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      header: "শিক্ষার্থী",
      accessorKey: "name",
      cell: (s: Student) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {s.photo_url ? (
              <Image src={s.photo_url} alt={s.name} width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
            ) : (
              <GraduationCap className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">{s.name}</p>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ID: {s.student_id || "N/A"}</p>
          </div>
        </div>
      )
    },
    {
      header: "ক্লাস ও সেকশন",
      accessorKey: "class",
      cell: (s: Student) => (
        <div>
          <p className="text-sm font-bold text-gray-700">{s.class || "N/A"}</p>
          <p className="text-xs text-gray-400 font-medium">{s.section || "N/A"} Section</p>
        </div>
      )
    },
    {
      header: "যোগাযোগ",
      accessorKey: "email",
      cell: (s: Student) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <Mail className="w-3 h-3" /> {s.email}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <Smartphone className="w-3 h-3" /> {s.phone || "N/A"}
          </div>
        </div>
      )
    },
    {
      header: "অ্যাকশন",
      accessorKey: "user_id",
      cell: (s: Student) => (
        <div className="flex items-center gap-2">
           <button 
             onClick={() => handleDelete(s)}
             className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      )
    }
  ];

  const classes = Array.prototype.concat("all", Array.from(new Set(students.map(s => s.class).filter(Boolean))));
  const filteredStudents = filterClass === "all" ? students : students.filter(s => s.class === filterClass);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-bengali">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2 mb-1">
            <GraduationCap className="w-8 h-8 text-blue-600" /> শিক্ষার্থী ম্যানেজমেন্ট
          </h1>
          <p className="text-gray-500 font-medium">শিক্ষার্থীদের প্রোফাইল, ক্লাস এবং হাজিরা রিপোর্ট নিয়ন্ত্রণ করুন।</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> শিক্ষার্থী যোগ করুন
        </button>
      </div>

      {/* Class Filters */}
      <Card className="p-4 border-transparent shadow-xl shadow-blue-500/5 rounded-2xl flex items-center gap-3 overflow-x-auto no-scrollbar">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        {classes.map((cls) => (
          <button
            key={cls}
            onClick={() => setFilterClass(cls)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-all ${
              filterClass === cls 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
              : "text-gray-400 hover:bg-blue-50"
            }`}
          >
            {cls === "all" ? "সকল শিক্ষার্থী" : `Class ${cls}`}
          </button>
        ))}
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border-transparent shadow-2xl shadow-blue-500/5 rounded-[2rem]">
        <DataTable 
          columns={columns} 
          data={filteredStudents} 
          searchPlaceholder="নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
        />
      </Card>

      {/* SlideOver Form */}
      <SlideOverForm
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="নতুন শিক্ষার্থী যোগ করুন"
      >
        <form onSubmit={handleCreate} className="space-y-5">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পুরো নাম</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder="যেমন: আরিয়ান আহমেদ"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ক্লাস</label>
                <input 
                  required
                  type="text" 
                  value={formData.class}
                  onChange={e => setFormData({...formData, class: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder="যেমন: Six"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">সেকশন</label>
                <input 
                  type="text" 
                  value={formData.section}
                  onChange={e => setFormData({...formData, section: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder="যেমন: A"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">রোল / আইডি</label>
                <input 
                  required
                  type="text" 
                  value={formData.student_id}
                  onChange={e => setFormData({...formData, student_id: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder="যেমন: 01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ফোন নম্বর</label>
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder="01712345678"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">কিভাবে যুক্ত করবেন?</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, identifierType: "email", identifier: "" })}
                    className={cn(
                      "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.identifierType === "email" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                    )}
                  >
                    ইমেইল দিয়ে
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, identifierType: "username", identifier: "" })}
                    className={cn(
                      "py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.identifierType === "username" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
                    )}
                  >
                    ইউজার আইডি দিয়ে
                  </button>
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {formData.identifierType === "email" ? "ইমেইল অ্যাড্রেস" : "ইউনিক ইউজার আইডি (Username)"}
                </label>
                <input 
                  required
                  type={formData.identifierType === "email" ? "email" : "text"} 
                  value={formData.identifier}
                  onChange={e => setFormData({...formData, identifier: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  placeholder={formData.identifierType === "email" ? "student@institute.com" : "যেমন: student_001"}
                />
              </div>
           </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {submitting ? "প্রসেসিং..." : <Plus className="w-5 h-5" />} শিক্ষার্থী তৈরি করুন
          </button>
        </form>
      </SlideOverForm>
    </div>
  );
}

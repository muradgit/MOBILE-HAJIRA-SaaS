"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  GraduationCap, 
  Loader2,
  BookOpen,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * Admin: Assign Classes to Teacher
 * Path: /admin/teachers/[id]/assign-classes
 */

interface TeacherData {
  name: string;
  nameBN?: string;
  email: string;
  role: string;
}

interface AssignedClass {
  id: string;
  name: string;
  nameBN?: string;
  section?: string;
  type: "class" | "exam";
}

export default function AssignClassesPage() {
  const { id: teacherId } = useParams() as { id: string };
  const { tenantId, user } = useUserStore();
  const router = useRouter();

  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State for new class
  const [newClassName, setNewClassName] = useState("");
  const [newClassNameBN, setNewClassNameBN] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newType, setNewType] = useState<"class" | "exam">("class");

  useEffect(() => {
    if (!tenantId || !teacherId) return;

    const fetchData = async () => {
      try {
        // Fetch Teacher Details
        const teacherDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, teacherId));
        if (teacherDoc.exists()) {
          setTeacher(teacherDoc.data() as TeacherData);
        } else {
          toast.error("শিক্ষক খুঁজে পাওয়া যায়নি");
          router.push("/admin/teachers");
          return;
        }

        // Fetch Currently Assigned Classes
        const q = query(
          collection(db, `tenants/${tenantId}/teacher_classes`),
          where("teacher_id", "==", teacherId)
        );
        const snapshot = await getDocs(q);
        const classes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AssignedClass[];
        
        setAssignedClasses(classes);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, teacherId, router]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    setSaving(true);
    try {
      const classData = {
        teacher_id: teacherId,
        name: newClassName,
        nameBN: newClassNameBN,
        section: newSection,
        type: newType,
        assigned_by: user?.user_id || "admin",
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, `tenants/${tenantId}/teacher_classes`), classData);
      
      setAssignedClasses([...assignedClasses, { id: docRef.id, ...classData } as AssignedClass]);
      
      // Reset Form
      setNewClassName("");
      setNewClassNameBN("");
      setNewSection("");
      toast.success("ক্লাস সফলভাবে অ্যাসাইন করা হয়েছে");
    } catch (error) {
      console.error("Error adding class:", error);
      toast.error("ক্লাস অ্যাসাইন করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই ক্লাসটি মুছে ফেলতে চান?")) return;

    try {
      await deleteDoc(doc(db, `tenants/${tenantId}/teacher_classes`, classId));
      setAssignedClasses(assignedClasses.filter(c => c.id !== classId));
      toast.success("ক্লাস সফলভাবে মুছে ফেলা হয়েছে");
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error("ক্লাস মুছতে সমস্যা হয়েছে");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-bengali">
      {/* Header */}
      <div className="bg-[#6f42c1] text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> শিক্ষকের তালিকায় ফিরে যান
          </button>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">ক্লাস অ্যাসাইন করুন</h1>
            <p className="text-purple-100 opacity-80">
              শিক্ষক: <span className="font-black text-white">{teacher?.nameBN || teacher?.name}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 space-y-8">
        {/* Form: Add New Class */}
        <Card className="p-8 border-none shadow-xl shadow-purple-900/5">
          <form onSubmit={handleAddClass} className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">নতুন ক্লাস যোগ করুন</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Class Name (English)</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class Ten"
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-200 font-bold placeholder:text-gray-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">ক্লাসের নাম (বাংলা)</label>
                <input 
                  type="text" 
                  value={newClassNameBN}
                  onChange={(e) => setNewClassNameBN(e.target.value)}
                  placeholder="যেমন: ১০ম শ্রেণী"
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-200 font-bold placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Section / শাখা</label>
                <input 
                  type="text" 
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="e.g. A / ক শাখা"
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-200 font-bold placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Type / ধরণ</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "class" | "exam")}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-200 font-bold"
                >
                  <option value="class">General Class (সাধারণ ক্লাস)</option>
                  <option value="exam">Exam / Event (পরীক্ষা/অনুষ্ঠান)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-5 bg-[#6f42c1] text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              অ্যাসাইনমেন্ট নিশ্চিত করুন
            </button>
          </form>
        </Card>

        {/* List of Assigned Classes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">বর্তমানে অ্যাসাইনকৃত ক্লাস ({assignedClasses.length})</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {assignedClasses.length > 0 ? (
                assignedClasses.map((cls, index) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-6 border-none shadow-sm hover:shadow-xl transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          cls.type === "exam" ? "bg-orange-50 text-orange-600" : "bg-purple-50 text-[#6f42c1]"
                        )}>
                          {cls.type === "exam" ? <BookOpen className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-black text-gray-900">{cls.nameBN || cls.name}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {cls.section ? `Section: ${cls.section}` : "No Section"} • {cls.type}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-3 bg-red-50 text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full p-12 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                      <AlertCircle className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                      <p className="font-black text-gray-900 text-lg">কোনো ক্লাস খুঁজে পাওয়া যায়নি</p>
                      <p className="text-sm text-gray-400">এই শিক্ষকের জন্য এখনো কোনো ক্লাস অ্যাসাইন করা হয়নি।</p>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Floating Success Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md pointer-events-none z-50">
        <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-2xl flex items-center justify-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
             Administrator Session: <span className="text-[#6f42c1]">Active Security Mode</span>
           </p>
        </div>
      </div>
    </div>
  );
}

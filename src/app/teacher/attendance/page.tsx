"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  QrCode, 
  Hash, 
  ScanFace, 
  Camera, 
  MapPin, 
  ChevronRight,
  GraduationCap,
  Loader2,
  AlertCircle,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { db, auth } from "@/src/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

/**
 * Teacher Attendance Page - MOBILE-HAJIRA SaaS
 * Main portal for teachers to take student attendance using 6 different methods.
 * Classes are fetched dynamically based on teacher assignments.
 */

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ATTENDANCE_METHODS = [
  {
    id: "manual",
    title: "ম্যানুয়াল হাজিরা",
    description: "শিক্ষার্থীদের তালিকা থেকে সরাসরি হাজিরা দিন",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
    hoverColor: "hover:bg-purple-600",
  },
  {
    id: "qr",
    title: "QR কোড স্ক্যান",
    description: "শিক্ষার্থীর আইডি কার্ডের QR কোড স্ক্যান করুন",
    icon: QrCode,
    color: "bg-blue-100 text-blue-600",
    hoverColor: "hover:bg-blue-600",
  },
  {
    id: "code",
    title: "কোড দিয়ে হাজিরা",
    description: "একটি নির্দিষ্ট কোড শেয়ার করে হাজিরা সংগ্রহ করুন",
    icon: Hash,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:bg-emerald-600",
  },
  {
    id: "face",
    title: "ফেস স্ক্যান",
    description: "ফেস রিকগনিশন ব্যবহার করে দ্রুত হাজিরা নিন",
    icon: ScanFace,
    color: "bg-orange-100 text-orange-600",
    hoverColor: "hover:bg-orange-600",
  },
  {
    id: "camera",
    title: "ক্যামেরা হাজিরা",
    description: "পুরো ক্লাসের ছবি বা ভিডিও থেকে অটোমেটিক হাজিরা",
    icon: Camera,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:bg-rose-600",
  },
  {
    id: "geo",
    title: "জিও লোকেশন",
    description: "শিক্ষার্থীর অবস্থান যাচাই করে হাজিরা নিশ্চিত করুন",
    icon: MapPin,
    color: "bg-indigo-100 text-indigo-600",
    hoverColor: "hover:bg-indigo-600",
  },
];

interface TeacherClass {
  id: string;
  name: string;
  nameBN?: string;
  section?: string;
  studentCount?: number;
}

export default function AttendancePage() {
  const { tenantId, user } = useUserStore();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  useEffect(() => {
    async function fetchAssignedClasses() {
      if (!tenantId || !user?.user_id) {
        setLoading(false);
        return;
      }

      const path = `tenants/${tenantId}/teacher_classes`;
      try {
        const q = query(
          collection(db, path),
          where("teacher_id", "==", user.user_id)
        );
        
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeacherClass[];
        
        setClasses(fetched);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignedClasses();
  }, [tenantId, user?.user_id]);

  const handleMethodClick = (methodName: string) => {
    if (!selectedClassId) {
      toast.warning(`ক্লাস সিলেক্ট করুন (টেস্টিং মোড: ${methodName})`, {
        description: "প্রোডাকশনে হাজিরা নিতে ক্লাস নির্বাচন বাধ্যতামূলক।",
        duration: 3000,
      });
      return;
    }
    toast.success(`${methodName} শুরু হচ্ছে...`);
    // Logic for navigating to selected attendance method would go here
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-bengali">
      {/* Demo Mode Indicator (Only if no class selected) */}
      {!selectedClassId && !loading && (
        <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1.5 text-center sticky top-0 z-[100] shadow-sm">
          Demo / Testing Mode Active
        </div>
      )}

      {/* Header Section */}
      <div className="bg-[#6f42c1] text-white pt-10 pb-16 px-6 rounded-b-[3rem] shadow-2xl shadow-purple-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">হাজিরা নিন</h1>
              <p className="text-purple-100 text-xs font-medium opacity-80 uppercase tracking-widest">Attendance Management Portal</p>
            </div>
          </div>
          <p className="text-purple-50 text-sm leading-relaxed max-w-sm">
            ধন্যবাদ শিক্ষক! আজকের ক্লাসের হাজিরা নিতে নিচের পদ্ধতিগুলো থেকে একটি বেছে নিন।
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 space-y-8">
        {/* Step 1: Dynamic Class Selection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> ক্লাস নির্বাচন করুন
            </h2>
            {selectedClassId && (
              <button 
                onClick={() => setSelectedClassId(null)}
                className="text-[10px] font-black text-purple-600 uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[60px]">
            {loading ? (
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-32 h-14 bg-white rounded-2xl animate-pulse flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                  </div>
                ))}
              </div>
            ) : classes.length > 0 ? (
              classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    "px-6 py-4 rounded-2xl font-black text-sm transition-all shrink-0 border-2",
                    selectedClassId === cls.id
                      ? "bg-[#6f42c1] border-[#6f42c1] text-white shadow-xl shadow-purple-600/20 scale-105"
                      : "bg-white border-transparent text-gray-500 hover:border-purple-200"
                  )}
                >
                  {cls.nameBN || cls.name} {cls.section ? `(${cls.section})` : ""}
                </button>
              ))
            ) : (
              <div className="w-full p-6 bg-purple-50 rounded-2xl flex items-center gap-4 text-purple-600">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-black text-sm">কোনো ক্লাস খুঁজে পাওয়া যায়নি!</p>
                  <p className="text-[10px] font-medium opacity-80">অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন বা নতুন ক্লাস তৈরি করুন।</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Attendance Methods Grid */}
        <section className="space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ChevronRight className="w-4 h-4" /> হাজিরা পদ্ধতি বেছে নিন
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {ATTENDANCE_METHODS.map((method, index) => {
                const Icon = method.icon;
                return (
                  <motion.button
                    key={method.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleMethodClick(method.title)}
                    className={cn(
                      "group text-left p-5 rounded-[2rem] bg-white border-2 border-transparent transition-all relative overflow-hidden shadow-sm hover:shadow-xl hover:border-[#6f42c1]/20 active:bg-gray-50 cursor-pointer",
                      !selectedClassId && "opacity-90"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-4 rounded-2xl transition-colors shrink-0",
                        method.color,
                        "group-hover:bg-purple-600 group-hover:text-white"
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-gray-900 leading-tight">
                          {method.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                          {method.description}
                        </p>
                      </div>
                    </div>
                    
                    {selectedClassId && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#6f42c1]" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Dynamic Empty State Advice */}
        {!selectedClassId && !loading && classes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-purple-50 rounded-3xl border border-purple-100 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <ChevronRight className="w-5 h-5 text-[#6f42c1] transform animate-bounce" />
            </div>
            <p className="text-xs font-bold text-purple-700 leading-relaxed">
              হাজিরা শুরু করতে অনুগ্রহ করে উপরের তালিকা থেকে একটি ক্লাস নির্বাচন করুন।
            </p>
          </motion.div>
        )}

        {/* Admin Link for missing classes */}
        {!loading && classes.length === 0 && (
          <div className="flex justify-center">
            <button className="flex items-center gap-2 text-[#6f42c1] font-black text-sm hover:underline">
              <PlusCircle className="w-4 h-4" /> নতুন ক্লাস তৈরি করুন
            </button>
          </div>
        )}
      </div>

      {/* Quick Footer Stats (Dynamic) */}
      {selectedClassId && selectedClass && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50">
          <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                 <Users className="w-5 h-5 text-[#6f42c1]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">নির্বাচিত ক্লাস</p>
                <p className="text-sm font-black text-gray-900 leading-tight">
                  {selectedClass.nameBN || selectedClass.name}
                </p>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-gray-100" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট শিক্ষার্থী</p>
                <p className="text-sm font-black text-[#6f42c1]">{selectedClass.studentCount || "..."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

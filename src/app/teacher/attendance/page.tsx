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
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Search,
  CheckSquare,
  Square,
  Save,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { db, auth } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

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

interface Student {
  user_id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  photo_url?: string;
}

export default function AttendancePage() {
  const { tenantId, user } = useUserStore();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Attendance State
  const [attendanceMethod, setAttendanceMethod] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Stats
  const presentCount = Object.values(attendance).filter(v => v).length;
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleMethodClick = async (methodId: string, methodName: string) => {
    if (!selectedClassId) {
      toast.error("অনুগ্রহ করে আগে একটি ক্লাস নির্বাচন করুন!");
      return;
    }

    if (methodId === "manual") {
      setAttendanceMethod("manual");
      await fetchStudentsForClass();
    } else {
      toast.success(`${methodName} শুরু হচ্ছে...`);
    }
  };

  const fetchStudentsForClass = async () => {
    if (!tenantId || !selectedClass) return;
    
    setFetchingStudents(true);
    try {
      const constraints = [
        where("tenant_id", "==", tenantId),
        where("role", "==", "student"),
        where("class", "==", selectedClass.name),
        where("status", "==", "approved")
      ];

      if (selectedClass.section) {
        constraints.push(where("section", "==", selectedClass.section));
      }

      const q = query(
        collection(db, "users"),
        ...constraints
      );
      
      const snapshot = await getDocs(q);
      const fetchedStudents = snapshot.docs.map(doc => ({
        user_id: doc.id,
        ...doc.data()
      })) as Student[];
      
      // Sort by student_id
      fetchedStudents.sort((a, b) => {
        const idA = a.student_id || "";
        const idB = b.student_id || "";
        return idA.localeCompare(idB, undefined, { numeric: true });
      });

      setStudents(fetchedStudents);
      
      // Initialize all as present
      const initialAttendance: Record<string, boolean> = {};
      fetchedStudents.forEach(s => {
        initialAttendance[s.user_id] = true;
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("শিক্ষার্থীদের তালিকা লোড করতে সমস্যা হয়েছে");
    } finally {
      setFetchingStudents(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAll = (status: boolean) => {
    const newBatch: Record<string, boolean> = {};
    students.forEach(s => {
      newBatch[s.user_id] = status;
    });
    setAttendance(newBatch);
    toast.info(status ? "সবাইকে উপস্থিত করা হয়েছে" : "সবাইকে অনুপস্থিত করা হয়েছে");
  };

  const handleSubmitAttendance = async () => {
    if (!tenantId || !selectedClass || !user) return;
    
    setSubmitting(true);
    try {
      const logsPath = `tenants/${tenantId}/attendance_logs`;
      const batchSize = Object.keys(attendance).length;
      
      if (batchSize === 0) {
        toast.error("কোনো শিক্ষার্থী পাওয়া যায়নি");
        return;
      }

      const timestamp = serverTimestamp();
      
      // We could use a Batch here, but for now we'll do it sequentially or in a simple way
      // Ideally, one attendance session document, and logs as individual items or subcollection
      
      const sessionData = {
        teacher_id: user.user_id,
        teacher_name: user.name,
        class_id: selectedClassId,
        class_name: selectedClass.name,
        section: selectedClass.section || "",
        total_students: students.length,
        present_count: presentCount,
        absent_count: students.length - presentCount,
        timestamp: timestamp,
        method: "manual"
      };

      // Create attendance session
      const sessionRef = await addDoc(collection(db, `tenants/${tenantId}/attendance_sessions`), sessionData);

      // Create individual logs
      const logPromises = students.map(s => {
        return addDoc(collection(db, logsPath), {
          student_id: s.user_id,
          student_name: s.name,
          roll_id: s.student_id,
          class_name: selectedClass.name,
          section: selectedClass.section || "",
          status: attendance[s.user_id] ? "present" : "absent",
          timestamp: timestamp,
          session_id: sessionRef.id,
          teacher_id: user.user_id
        });
      });

      await Promise.all(logPromises);

      toast.success("হাজিরা সফলভাবে জমা দেওয়া হয়েছে!");
      setAttendanceMethod(null);
      setSelectedClassId(null);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast.error("হাজিরা জমা দিতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-bengali">
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
        <AnimatePresence mode="wait">
          {!attendanceMethod ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
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
                    <div className="w-full p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-purple-200 flex flex-col items-center gap-4 text-center">
                      <div className="p-4 bg-purple-50 rounded-2xl text-purple-400">
                        <AlertCircle className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-gray-900 text-lg">আপনাকে এখনো কোনো ক্লাস অ্যাসাইন করা হয়নি।</p>
                        <p className="text-sm font-medium text-gray-400">অনুগ্রহ করে Institute Admin-এর সাথে যোগাযোগ করুন।</p>
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
                  {ATTENDANCE_METHODS.map((method, index) => {
                    const Icon = method.icon;
                    return (
                      <motion.button
                        key={method.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: selectedClassId ? 1.02 : 1 }}
                        whileTap={{ scale: selectedClassId ? 0.98 : 1 }}
                        onClick={() => handleMethodClick(method.id, method.title)}
                        className={cn(
                          "group text-left p-5 rounded-[2rem] bg-white border-2 border-transparent transition-all relative overflow-hidden",
                          selectedClassId 
                            ? "shadow-sm hover:shadow-xl hover:border-[#6f42c1]/20 active:bg-gray-50 cursor-pointer" 
                            : "opacity-60 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-4 rounded-2xl transition-colors shrink-0",
                            method.color,
                            selectedClassId && `group-hover:${method.hoverColor.replace('hover:', '')} group-hover:text-white`
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
            </motion.div>
          ) : (
            <motion.div
              key="manual-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Manual Attendance Header */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setAttendanceMethod(null)}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Manual Mode</span>
                </div>
              </div>

              <Card className="p-6 border-none shadow-xl shadow-purple-900/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 font-bengali">শিক্ষার্থীদের তালিকা</h2>
                    <p className="text-xs text-gray-400 font-medium">নিচের তালিকা থেকে উপস্থিত শিক্ষার্থীদের সবুজ সিলেক্ট করুন</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => markAll(true)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      সবাই উপস্থিত
                    </button>
                    <button 
                      onClick={() => markAll(false)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                    >
                      সবাই অনুপস্থিত
                    </button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
                   <input 
                      type="text" 
                      placeholder="নাম বা আইডি দিয়ে সার্চ করুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-300"
                   />
                </div>
              </Card>

              {/* Students List */}
              <div className="space-y-3 pb-32">
                {fetchingStudents ? (
                  <div className="p-12 flex flex-col items-center justify-center text-center gap-4 bg-white rounded-[3rem]">
                      <Loader2 className="w-10 h-10 animate-spin text-[#6f42c1]" />
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading students list...</p>
                  </div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student, idx) => (
                    <motion.div
                      key={student.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <button
                        onClick={() => toggleAttendance(student.user_id)}
                        className={cn(
                          "w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all active:scale-[0.98]",
                          attendance[student.user_id] 
                            ? "bg-white border-emerald-500/20 shadow-lg shadow-emerald-500/5 ring-4 ring-emerald-500/5" 
                            : "bg-white border-transparent text-gray-400 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border-2",
                            attendance[student.user_id] ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-gray-100 border-transparent text-gray-300"
                          )}>
                             {student.name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <h4 className={cn("font-black text-sm", attendance[student.user_id] ? "text-gray-900" : "text-gray-400")}>{student.name}</h4>
                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">ID: {student.student_id}</p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                          attendance[student.user_id] ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-gray-100 text-gray-300"
                        )}>
                           {attendance[student.user_id] ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                        </div>
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-12 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 space-y-3">
                     <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
                     <p className="text-gray-400 font-bold">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Footer Stats & Action */}
      <AnimatePresence>
        {selectedClassId && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50 flex flex-col gap-4"
          >
            {attendanceMethod === "manual" ? (
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-[2.5rem] shadow-2xl flex flex-col gap-4">
                 <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-3">
                       <Clock className="w-4 h-4 text-[#6f42c1]" />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Attendance Summary</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-emerald-600">{presentCount} Present</span>
                       <span className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-xs font-black text-red-500">{students.length - presentCount} Absent</span>
                    </div>
                 </div>

                 <button 
                  onClick={handleSubmitAttendance}
                  disabled={submitting || fetchingStudents}
                  className="w-full py-5 bg-[#6f42c1] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                 >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    হাজিরা জমা দিন
                 </button>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#6f42c1]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">নির্বাচিত ক্লাস</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {selectedClass?.nameBN || selectedClass?.name}
                    </p>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-gray-100" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট শিক্ষার্থী</p>
                    <p className="text-sm font-black text-[#6f42c1]">{selectedClass?.studentCount || "..."}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { 
  CheckCircle, 
  XCircle, 
  QrCode, 
  ClipboardList, 
  Loader2, 
  Users, 
  Calendar, 
  ChevronRight, 
  Zap, 
  ShieldAlert,
  Search,
  Filter,
  Check
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { Card } from "@/src/components/ui/Card";
import { UserData, Tenant } from "@/src/lib/types";

interface StudentAttendance {
  user_id: string;
  name: string;
  nameBN?: string;
  status: "present" | "absent";
  roll?: string;
}

/**
 * Teacher Attendance Panel
 * Step 5.1: Manual & Session Code Attendance
 */
export default function TeacherAttendancePage() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId: storeTenantId } = useUserStore();
  
  const [activeTab, setActiveTab] = useState<"manual" | "smart-code">("manual");
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Manual Mode State
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Smart Code State
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  // 1. Resolve Tenant ID
  useEffect(() => {
    if (storeTenantId) setActiveTenantId(storeTenantId);
    else if (userData?.tenant_id) setActiveTenantId(userData.tenant_id);
  }, [storeTenantId, userData]);

  // 2. Fetch Tenant Config (Classes/Depts)
  useEffect(() => {
    if (!activeTenantId) return;
    const unsub = onSnapshot(doc(db, "tenants", activeTenantId), (snap) => {
      if (snap.exists()) setTenant(snap.data() as Tenant);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTenantId]);

  // 3. Fetch Students for Manual List
  const fetchStudents = async () => {
    if (!activeTenantId || !selectedClass) return;
    
    setFetchingStudents(true);
    try {
      const q = query(
        collection(db, "users"),
        where("tenant_id", "==", activeTenantId),
        where("role", "==", "Student"),
        where("class", "==", selectedClass),
        ...(selectedDept ? [where("department", "==", selectedDept)] : [])
      );

      const snap = await getDocs(q);
      const studentData = snap.docs.map(doc => {
        const data = doc.data() as UserData;
        return {
          user_id: doc.id,
          name: data.name,
          nameBN: data.nameBN || "",
          status: "present" as const, // Default to present
          roll: data.student_id ? data.student_id.split("-").pop() : "" // Mock roll from ID
        };
      });

      setStudents(studentData);
      if (studentData.length === 0) toast.info("এই ক্লাসে কোনো শিক্ষার্থী খুঁজে পাওয়া যায়নি");
    } catch (err: any) {
      console.error("Fetch Students Error:", err);
      toast.error("শিক্ষার্থী তালিকা লোড করতে সমস্যা হয়েছে");
    } finally {
      setFetchingStudents(false);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    if (activeTab === "manual" && selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, selectedDept, activeTab]);

  // 4. Handle Single Student Status Toggle
  const toggleStatus = (userId: string, status: "present" | "absent") => {
    setStudents(prev => prev.map(s => 
      s.user_id === userId ? { ...s, status } : s
    ));
  };

  // 5. Submit Manual Attendance
  const handleSaveManualAttendance = async () => {
    if (!selectedClass) return toast.error("একটি ক্লাস সিলেক্ট করুন");
    if (!selectedSubject) return toast.error("একটি বিষয় (Subject) সিলেক্ট করুন");
    if (students.length === 0) return toast.error("শিক্ষার্থী তালিকা খালি");
    
    setIsSubmitting(true);
    
    try {
      const presentStudents = students
        .filter(s => s.status === "present")
        .map(s => s.nameBN || s.name);
        
      const absentStudents = students
        .filter(s => s.status === "absent")
        .map(s => s.nameBN || s.name);

      const payload = {
        tenant_id: activeTenantId,
        classId: selectedClass,
        section: selectedDept || "All",
        subject: selectedSubject,
        teacherName: userData?.name || "Unknown Teacher",
        totalPresent: presentStudents.length,
        totalAbsent: absentStudents.length,
        presentStudents,
        absentStudents
      };

      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "হাজিরা সেভ করতে সমস্যা হয়েছে");

      toast.success("সাফল্যজনকভাবে হাজিরা সাবমিট করা হয়েছে।", {
        description: `উপস্থিত: ${presentStudents.length}, অনুপস্থিত: ${absentStudents.length}. এটি শীঘ্রই শিটে যুক্ত হবে।`
      });

    } catch (err: any) {
      console.error("Submission Error:", err);
      toast.error(err.message || "হাজিরা সেভ করতে ব্যর্থ হয়েছে");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Generate Smart Session Code
  const handleGenerateCode = async () => {
    if (!selectedClass) return toast.error("একটি ক্লাস সিলেক্ট করুন");
    
    setIsGenerating(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await addDoc(collection(db, "session_codes"), {
        code,
        tenant_id: activeTenantId,
        class: selectedClass,
        department: selectedDept || "All",
        teacher_id: userData?.user_id,
        teacher_name: userData?.name,
        date: attendanceDate,
        expires_at: Timestamp.fromDate(expiresAt),
        status: "active",
        created_at: serverTimestamp()
      });

      setGeneratedCode(code);
      setExpiryTime(expiresAt);
      toast.success("সেশন কোড তৈরি হয়েছে! শিক্ষার্থীরা এখন হাজিরা দিতে পারবে।");
    } catch (err: any) {
      toast.error("কোড তৈরি করতে ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Search Filter
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nameBN?.includes(searchQuery) ||
    s.roll?.includes(searchQuery)
  );

  // Auth/Role Protection
  const isAuthorized = userData?.role === "Teacher" || userData?.role === "SuperAdmin" || userData?.role === "InstitutionAdmin" ;

  if (authLoading || (loading && !tenant)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-black text-red-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 max-w-xs font-bengali">শুধুমাত্র শিক্ষকরা এই প্যানেলটি ব্যবহার করতে পারবেন।</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 p-2 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900 font-bengali">শিক্ষার্থী হাজিরা</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Attendance Management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl font-bengali">
        <button 
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "manual" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"
          )}
        >
          <CheckCircle className="w-4 h-4" /> ম্যানুয়াল হাজিরা
        </button>
        <button 
          onClick={() => setActiveTab("smart-code")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "smart-code" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"
          )}
        >
          <QrCode className="w-4 h-4" /> স্মার্ট কোড
        </button>
      </div>

      {/* Common Filters Container */}
      <Card className="p-6 border-transparent shadow-xl shadow-purple-500/5 rounded-[2rem]">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Users className="w-3 h-3" /> ক্লাস
              </label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              >
                <option value="">ক্লাস সিলেক্ট করুন</option>
                {tenant?.classes?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Filter className="w-3 h-3" /> বিভাগ / সেকশন
              </label>
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              >
                <option value="">সকল বিভাগ</option>
                {tenant?.departments?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> বিষয় (Subject)
              </label>
              <input 
                type="text"
                placeholder="বিষয় লিখুন..."
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> তারিখ
              </label>
              <input 
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm font-bold"
              />
            </div>
         </div>
      </Card>

      {/* Manual Tab Body */}
      {activeTab === "manual" && (
        <div className="space-y-4">
           {selectedClass ? (
             <div className="space-y-4">
                {/* Local Search */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input 
                    type="text"
                    placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-medium"
                  />
                </div>

                {fetchingStudents ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">শিক্ষার্থী তালিকা নিয়ে আসা হচ্ছে...</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-20">
                    {filteredStudents.map((student) => (
                      <Card key={student.user_id} className="p-4 border-transparent shadow-sm flex items-center justify-between gap-4 rounded-2xl hover:shadow-md transition-all group overflow-hidden relative">
                         {student.status === "present" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                         {student.status === "absent" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                         
                         <div className="flex items-center gap-3 overflow-hidden">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                             student.status === "present" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                           )}>
                             {student.roll || "#"}
                           </div>
                           <div className="min-w-0">
                              <h4 className="text-sm font-black text-gray-900 font-bengali truncate">{student.nameBN || student.name}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{student.user_id.slice(-6).toUpperCase()}</p>
                           </div>
                         </div>

                         <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => toggleStatus(student.user_id, "present")}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                student.status === "present" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-gray-50 text-gray-300 hover:bg-emerald-50"
                              )}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => toggleStatus(student.user_id, "absent")}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                student.status === "absent" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-gray-50 text-gray-300 hover:bg-red-50"
                              )}
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                         </div>
                      </Card>
                    ))}

                    {/* Bottom Action Bar */}
                    <div className="fixed bottom-20 left-0 right-0 p-4 max-w-4xl mx-auto z-40 bg-transparent pointer-events-none">
                       <button 
                         disabled={isSubmitting}
                         onClick={handleSaveManualAttendance}
                         className="pointer-events-auto w-full bg-purple-600 disabled:bg-purple-300 text-white py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-600/40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all font-bengali"
                       >
                         {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                         হাজিরা সেভ করুন
                       </button>
                    </div>
                  </div>
                )}
             </div>
           ) : (
             <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 flex flex-col items-center gap-4">
                <Filter className="w-12 h-12 text-gray-100" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest font-bengali">একটি ক্লাস সিলেক্ট করে ডাটা লোড করুন</p>
             </div>
           )}
        </div>
      )}

      {/* Smart Code Tab Body */}
      {activeTab === "smart-code" && (
        <Card className="p-10 border-transparent shadow-2xl shadow-purple-500/5 rounded-[3rem] text-center space-y-8">
           {!generatedCode ? (
              <div className="space-y-6">
                 <div className="w-20 h-20 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mx-auto ring-8 ring-purple-600/5">
                   <Zap className="w-10 h-10 text-purple-600" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 font-bengali">স্মার্ট সেশন জেনারেটর</h3>
                    <p className="text-sm text-gray-500 font-medium font-bengali max-w-xs mx-auto leading-relaxed">শিক্ষার্থীরা তাদের অ্যাপে এই কোডটি দিয়ে স্বয়ংক্রিয়ভাবে হাজিরা দিতে পারবে।</p>
                 </div>
                 
                 <button 
                   disabled={isGenerating || !selectedClass}
                   onClick={handleGenerateCode}
                   className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-100 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 font-bengali"
                 >
                   {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                   কোড তৈরি করুন
                 </button>
              </div>
           ) : (
              <div className="space-y-8 animate-in zoom-in duration-500">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em]">ACTIVE SESSION CODE</p>
                    <h2 className="text-7xl font-black text-gray-900 tracking-tighter">{generatedCode}</h2>
                 </div>

                 <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <p className="text-[11px] font-black text-emerald-600 tracking-widest font-bengali italic">
                       কোডটি আগামী ১০ মিনিট সক্রিয় থাকবে।
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Class</p>
                       <p className="text-sm font-bold text-gray-900">{selectedClass}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expires at</p>
                       <p className="text-sm font-bold text-gray-900">{expiryTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                 </div>

                 <button 
                  onClick={() => setGeneratedCode(null)}
                  className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-red-500 transition-colors"
                 >
                   Cancel & New Code
                 </button>
              </div>
           )}
        </Card>
      )}

      {/* Info Card */}
      <div className="mx-auto max-w-sm text-center space-y-2 py-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] font-bengali">
          সাহায্যের জন্য <span className="text-purple-600">গাইড ভিডিও</span> দেখুন
        </p>
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
           <div className="w-2/3 h-full bg-purple-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

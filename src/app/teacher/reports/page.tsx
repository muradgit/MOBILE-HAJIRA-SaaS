"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/hooks/useAuth";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

// --- Types ---
interface AttendanceLog {
  id: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  method: string;
  stats: {
    present: number;
    absent: number;
    total: number;
  };
  createdAt: any;
}

interface TeacherClass {
  id: string;
  name: string;
  nameBN: string;
  section: string;
}

export default function TeacherReportsPage() {
  const { userData, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("month");
  const [searchStudent, setSearchStudent] = useState("");

  // Stats
  const [stats, setStats] = useState({
    avgPercentage: 0,
    totalSessions: 0,
    totalPresent: 0,
    totalAbsent: 0
  });

  useEffect(() => {
    if (!userData || !userData.tenant_id) return;
    fetchData();
  }, [userData, selectedClassId, dateRange]);

  const fetchData = async () => {
    if (!userData || !userData.tenant_id) return;
    setLoading(true);
    try {
      const tenantId = userData.tenant_id;
      
      // 1. Fetch Classes (for filter)
      const classesRef = collection(db, `tenants/${tenantId}/teacher_classes`);
      const classesQuery = query(classesRef, where("teacher_id", "==", userData.user_id));
      const classesSnap = await getDocs(classesQuery);
      const classData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeacherClass[];
      setClasses(classData);

      // 2. Fetch Logs
      const logsRef = collection(db, `tenants/${tenantId}/attendance_logs`);
      let logsQuery = query(
        logsRef, 
        where("teacherId", "==", userData.user_id),
        orderBy("date", "desc"),
        limit(100)
      );

      // Apply Class Filter
      if (selectedClassId !== "all") {
        logsQuery = query(logsRef, 
          where("teacherId", "==", userData.user_id),
          where("classId", "==", selectedClassId),
          orderBy("date", "desc")
        );
      }

      const logsSnap = await getDocs(logsQuery);
      let logData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceLog[];

      // Filter by Date Range (client-side simple filter for now)
      const now = new Date();
      if (dateRange === "today") {
        const todayStr = now.toISOString().split('T')[0];
        logData = logData.filter(l => l.date === todayStr);
      } else if (dateRange === "week") {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        logData = logData.filter(l => new Date(l.date) >= lastWeek);
      } else if (dateRange === "month") {
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        logData = logData.filter(l => new Date(l.date) >= lastMonth);
      }

      setLogs(logData);

      // Calculate Stats
      if (logData.length > 0) {
        const totalSessions = logData.length;
        const totalPresent = logData.reduce((acc, curr) => acc + (curr.stats?.present || 0), 0);
        const totalAbsent = logData.reduce((acc, curr) => acc + (curr.stats?.absent || 0), 0);
        const totalStudents = totalPresent + totalAbsent;
        const avgPercentage = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 0;

        setStats({
          avgPercentage: Math.round(avgPercentage),
          totalSessions,
          totalPresent,
          totalAbsent
        });
      } else {
        setStats({ avgPercentage: 0, totalSessions: 0, totalPresent: 0, totalAbsent: 0 });
      }

    } catch (err) {
      console.error("Fetch reports error:", err);
      toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    toast.info("পিডিএফ এক্সপোর্ট ফাইল প্রস্তুত হচ্ছে...");
    // Future implementation: Add jsPDF or similar
  };

  const exportExcel = () => {
    toast.info("এক্সেল ফাইল প্রস্তুত হচ্ছে...");
    // Future implementation: Add sheetjs or similar
  };

  const columns = [
    { 
      header: "তারিখ", 
      accessorKey: "date",
      cell: (item: AttendanceLog) => (
        <div className="flex flex-col">
          <span className="font-bold">{item.date}</span>
          <span className="text-[10px] text-gray-400 font-mono uppercase">
            {item.createdAt instanceof Timestamp ? item.createdAt.toDate().toLocaleTimeString() : ""}
          </span>
        </div>
      )
    },
    { header: "ক্লাস / সেকশন", accessorKey: "className", cell: (item: AttendanceLog) => (
      <div className="flex flex-col">
         <span className="font-bold text-[#6f42c1]">{item.className}</span>
         <span className="text-xs text-gray-500">{item.subject || "সাধারণ পাঠ"}</span>
      </div>
    )},
    { header: "উপস্থিতি", accessorKey: "stats.present", cell: (item: AttendanceLog) => (
      <div className="flex items-center gap-2">
         <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-600 text-xs font-bold">
               {item.stats.present}
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-100 border-2 border-white flex items-center justify-center text-rose-600 text-xs font-bold">
               {item.stats.absent}
            </div>
         </div>
         <span className="text-xs font-bold text-gray-400">Total: {item.stats.total}</span>
      </div>
    )},
    { header: "শতকরা", accessorKey: "percentage", cell: (item: AttendanceLog) => {
      const percentage = item.stats.total > 0 ? Math.round((item.stats.present / item.stats.total) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
           <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  percentage > 80 ? "bg-emerald-500" : percentage > 50 ? "bg-amber-500" : "bg-rose-500"
                )} 
                style={{ width: `${percentage}%` }}
              />
           </div>
           <span className="text-xs font-bold">{percentage}%</span>
        </div>
      );
    }},
    { header: "পদ্ধতি", accessorKey: "method", cell: (item: AttendanceLog) => (
       <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg w-fit">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.method}</span>
       </div>
    )}
  ];

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#6f42c1]" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-6">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-[#6f42c1]" />
                    হাজিরা রিপোর্ট
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">আপনার পরিচালিত ক্লাসের উপস্থিতির বিস্তারিত তথ্য।</p>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={exportPDF}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button 
                    onClick={exportExcel}
                    className="flex items-center gap-2 bg-[#6f42c1] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                  </button>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="p-6 border-none shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-[#6f42c1]">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">গড় উপস্থিতি</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.avgPercentage}%</h3>
              </div>
           </Card>
           <Card className="p-6 border-none shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">মোট সেশন</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.totalSessions}</h3>
              </div>
           </Card>
           <Card className="p-6 border-none shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">মোট উপস্থিত</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.totalPresent}</h3>
              </div>
           </Card>
           <Card className="p-6 border-none shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">মোট অনুপস্থিত</p>
                <h3 className="text-3xl font-black text-gray-900">{stats.totalAbsent}</h3>
              </div>
           </Card>
        </div>

        {/* Filters */}
        <div className="mt-10 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ক্লাস ফিল্টার</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select 
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#6f42c1] outline-none appearance-none cursor-pointer min-w-[200px]"
                      >
                         <option value="all">সকল ক্লাস</option>
                         {classes.map(c => (
                           <option key={c.id} value={c.id}>{c.nameBN || c.name} ({c.section})</option>
                         ))}
                      </select>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">সময় ফিল্টার</label>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                       {[
                         { id: "today", label: "আজ" },
                         { id: "week", label: "সপ্তাহ" },
                         { id: "month", label: "মাস" },
                         { id: "all", label: "সব" }
                       ].map((r) => (
                         <button
                           key={r.id}
                           onClick={() => setDateRange(r.id as any)}
                           className={cn(
                             "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                             dateRange === r.id ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-500 hover:text-gray-700"
                           )}
                         >
                           {r.label}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 text-sm font-bold text-[#6f42c1] hover:bg-purple-50 px-4 py-2 rounded-xl transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} /> ডেটা রিফ্রেশ করুন
              </button>
           </div>
        </div>

        {/* Detailed Table */}
        <div className="mt-8">
           <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-400" />
              সম্প্রতি নেওয়া হাজিরাগুলো
           </h3>
           <DataTable 
             columns={columns} 
             data={logs} 
             searchPlaceholder="তারিখ বা ক্লাস দিয়ে খুজুন..." 
           />
        </div>
      </div>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

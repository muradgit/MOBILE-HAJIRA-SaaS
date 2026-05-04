"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Clock,
  FileSpreadsheet,
  Loader2,
  School,
  ArrowUpRight,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  where,
  Timestamp 
} from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

// --- Types ---
interface AttendanceLog {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
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

interface Teacher {
  user_id: string;
  name: string;
}

export default function AdminAttendanceReportPage() {
  const { userData, loading: authLoading } = useAuth();
  
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("month");

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
  }, [userData, selectedTeacherId, dateRange]);

  const fetchData = async () => {
    if (!userData || !userData.tenant_id) return;
    setLoading(true);
    try {
      const tenantId = userData.tenant_id;
      
      // 1. Fetch Teachers (for filter)
      const teachersRef = collection(db, `tenants/${tenantId}/teachers`);
      const teachersSnap = await getDocs(teachersRef);
      const teacherData = teachersSnap.docs.map(doc => ({ 
        user_id: doc.id, 
        name: doc.data().name 
      })) as Teacher[];
      setTeachers(teacherData);

      // 2. Fetch Logs
      const logsRef = collection(db, `tenants/${tenantId}/attendance_logs`);
      let logsQuery = query(
        logsRef, 
        orderBy("date", "desc"),
        limit(200)
      );

      // Apply Teacher Filter
      if (selectedTeacherId !== "all") {
        logsQuery = query(logsRef, 
          where("teacherId", "==", selectedTeacherId),
          orderBy("date", "desc")
        );
      }

      const logsSnap = await getDocs(logsQuery);
      let logData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AttendanceLog[];

      // Clientside Date Filter
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
      console.error("Fetch admin reports error:", err);
      toast.error("তথ্য লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      header: "তারিখ", 
      accessorKey: "date",
      cell: (item: AttendanceLog) => (
        <span className="font-bold">{item.date}</span>
      )
    },
    { header: "শিক্ষক", accessorKey: "teacherName", cell: (item: AttendanceLog) => (
      <div className="flex items-center gap-2">
         <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] font-bold text-[10px]">
           {item.teacherName?.charAt(0)}
         </div>
         <span className="font-medium text-gray-700">{item.teacherName}</span>
      </div>
    )},
    { header: "ক্লাস", accessorKey: "className", cell: (item: AttendanceLog) => (
       <div className="bg-gray-50 px-2 py-1 rounded-lg w-fit text-xs font-bold text-gray-600">
          {item.className}
       </div>
    )},
    { header: "উপস্থিতি", accessorKey: "stats.present", cell: (item: AttendanceLog) => (
       <span className="text-emerald-600 font-bold">{item.stats.present} <span className="text-gray-300 font-normal">/ {item.stats.total}</span></span>
    )},
    { header: "শতকরা", accessorKey: "percentage", cell: (item: AttendanceLog) => {
      const percentage = item.stats.total > 0 ? Math.round((item.stats.present / item.stats.total) * 100) : 0;
      return (
        <span className={cn(
          "font-black",
          percentage > 80 ? "text-emerald-500" : percentage > 50 ? "text-amber-500" : "text-rose-500"
        )}>
          {percentage}%
        </span>
      );
    }}
  ];

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#6f42c1]" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* Header Area */}
      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-6">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-200">
                    <School className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900">ইনস্টিটিউট রিপোর্ট</h1>
                    <p className="text-gray-500 text-sm mt-0.5">প্রতিষ্ঠানের সামগ্রিক উপস্থিতির চিত্র দেখুন।</p>
                  </div>
               </div>
               <button className="flex items-center gap-2 bg-[#6f42c1] text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all">
                  <Download className="w-5 h-5" /> রিপোর্ট ডাউনলোড
               </button>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="p-6 bg-white border-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <UserCheck className="w-6 h-6 text-purple-600 mb-4 relative z-10" />
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest relative z-10">গড় উপস্থিতি</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <h3 className="text-3xl font-black text-gray-900">{stats.avgPercentage}%</h3>
                <span className="text-emerald-500 text-xs font-bold flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> +2%
                </span>
              </div>
           </Card>

           <Card className="p-6 bg-white border-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <BarChart3 className="w-6 h-6 text-blue-600 mb-4 relative z-10" />
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest relative z-10">মোট সেশন</p>
              <h3 className="text-3xl font-black text-gray-900 relative z-10">{stats.totalSessions}</h3>
           </Card>

           <Card className="p-6 bg-white border-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-4 relative z-10" />
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest relative z-10">মোট উপস্থিত</p>
              <h3 className="text-3xl font-black text-gray-900 relative z-10">{stats.totalPresent}</h3>
           </Card>

           <Card className="p-6 bg-white border-none shadow-sm relative overflow-hidden group">
              <div className="absolute -right-2 -top-2 w-16 h-16 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <XCircle className="w-6 h-6 text-rose-600 mb-4 relative z-10" />
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest relative z-10">মোট অনুপস্থিত</p>
              <h3 className="text-3xl font-black text-gray-900 relative z-10">{stats.totalAbsent}</h3>
           </Card>
        </div>

        {/* Global Filters */}
        <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end">
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1">শিক্ষক সিলেক্ট করুন</label>
              <select 
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#6f42c1] outline-none min-w-[240px]"
              >
                 <option value="all">সকল শিক্ষক</option>
                 {teachers.map(t => (
                   <option key={t.user_id} value={t.user_id}>{t.name}</option>
                 ))}
              </select>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 ml-1">সময় ফিল্টার</label>
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
                       "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                       dateRange === r.id ? "bg-white text-[#6f42c1] shadow-sm" : "text-gray-500 hover:text-gray-700"
                     )}
                   >
                     {r.label}
                   </button>
                 ))}
              </div>
           </div>

           <button 
             onClick={fetchData}
             className="ml-auto bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl transition-all"
           >
             <Clock className={cn("w-5 h-5 text-gray-400", loading && "animate-spin")} />
           </button>
        </div>

        {/* Main Table */}
        <div className="mt-8">
           <Card className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black text-gray-800">বিস্তারিত হাজিরা রেকর্ড</h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    <TrendingUp className="w-3 h-3" /> লাইভ আপডেট
                 </div>
              </div>

              <DataTable 
                columns={columns} 
                data={logs} 
                searchPlaceholder="শিক্ষক বা ক্লাস দিয়ে খুজুন..." 
              />
           </Card>
        </div>
      </div>
    </div>
  );
}

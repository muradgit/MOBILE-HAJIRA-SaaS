"use client";

import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Users, 
  Calendar, 
  Download, 
  Search, 
  ChevronRight, 
  Filter,
  BarChart3,
  UserCheck,
  UserMinus,
  PieChart,
  Printer,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

/**
 * Teacher Reports Page - MOBILE-HAJIRA SaaS
 * Provides detailed attendance analytics for classes and individual students.
 */

// --- Mock Data ---
const CLASSES = ["Six", "Seven", "Eight", "Nine", "Ten"];

const CLASS_REPORTS = [
  { date: "২০২৪-০৫-০১", present: 45, total: 50, percentage: 90, method: "QR Scan" },
  { date: "২০২৪-০৪-৩০", present: 42, total: 50, percentage: 84, method: "Manual" },
  { date: "২০২৪-০৪-২৯", present: 48, total: 50, percentage: 96, method: "Face Scan" },
  { date: "২০২৪-০৪-২৮", present: 40, total: 50, percentage: 80, method: "Code Entry" },
];

const STUDENTS = [
  { id: "S101", name: "আব্দুর রহমান", class: "Ten", attendance: 92 },
  { id: "S102", name: "ফাতেমা আক্তার", class: "Ten", attendance: 95 },
  { id: "S103", name: "মেহেদী হাসান", class: "Ten", attendance: 78 },
  { id: "S104", name: "জারিফ আহমেদ", class: "Ten", attendance: 85 },
];

const STUDENT_HISTORY = [
  { date: "২০২৪-০৫-০১", status: "present", method: "QR Scan" },
  { date: "২০২৪-০৪-৩০", status: "present", method: "Manual" },
  { date: "২০২৪-০৪-২৯", status: "absent", method: "N/A" },
  { date: "২০২৪-০৪-২৮", status: "present", method: "Face Scan" },
];

export default function ReportsPage() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<"class" | "student">("class");
  const [selectedClass, setSelectedClass] = useState("Ten");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<typeof STUDENTS[0] | null>(null);
  const [dateRange, setDateRange] = useState("This Month");

  const filteredStudents = useMemo(() => {
    return STUDENTS.filter(s => 
      s.name.includes(searchQuery) || s.id.includes(searchQuery)
    );
  }, [searchQuery]);

  const handleExport = (type: string) => {
    toast.info(`${type} রিপোর্ট ডাউনলোড হচ্ছে...`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-bengali">
      {/* Header */}
      <div className="bg-[#6f42c1] text-white pt-10 pb-20 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">হাজিরা রিপোর্ট</h1>
            <p className="text-purple-100 text-sm opacity-80">আপনার ক্লাসের উপস্থিতির বিস্তারিত তথ্য দেখুন</p>
          </div>

          {/* Date Selector */}
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 self-start">
            {["Today", "This Week", "This Month"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateRange === range ? "bg-white text-[#6f42c1] shadow-lg" : "text-white/60 hover:text-white"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <div className="bg-white p-1.5 rounded-[2rem] shadow-xl flex items-center justify-between border border-gray-100">
          <button
            onClick={() => { setActiveTab("class"); setSelectedStudent(null); }}
            className={cn(
              "flex-1 py-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all",
              activeTab === "class" ? "bg-purple-50 text-[#6f42c1] shadow-inner" : "text-gray-400"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-black">ক্লাস রিপোর্ট</span>
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={cn(
              "flex-1 py-4 rounded-[1.5rem] flex items-center justify-center gap-2 transition-all",
              activeTab === "student" ? "bg-purple-50 text-[#6f42c1] shadow-inner" : "text-gray-400"
            )}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-black">শিক্ষার্থী রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "class" ? (
            <motion.div
              key="class-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Class Selector & Stats */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl text-[#6f42c1]">
                      <Filter className="w-4 h-4" />
                    </div>
                    <select 
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 font-black text-gray-900 text-lg cursor-pointer"
                    >
                      {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleExport('PDF')} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#6f42c1] transition-colors shadow-sm">
                      <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => window.print()} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#6f42c1] transition-colors shadow-sm">
                      <Printer className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "মোট শিক্ষার্থী", value: "৫০", icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "আজ উপস্থিত", value: "৪৫", icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
                    { label: "পাবলিক উপস্থিতি", value: "৯০%", icon: PieChart, color: "text-purple-600 bg-purple-50" },
                    { label: "অনুপস্থিত", value: "০৫", icon: UserMinus, color: "text-rose-600 bg-rose-50" },
                  ].map((stat, i) => (
                    <Card key={i} className="p-4 flex flex-col items-center text-center space-y-2 border-transparent shadow-sm">
                      <div className={cn("p-3 rounded-2xl", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                      <h4 className="text-xl font-black text-gray-900">{stat.value}</h4>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Attendance Log Table */}
              <section className="space-y-4">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> হাজিরা ইতিহাস
                </h3>
                <Card className="overflow-hidden border-transparent shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">উপস্থিত শিক্ষার্থী</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">শতাংশ (%)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">পদ্ধতি</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {CLASS_REPORTS.map((report, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-900 text-sm">{report.date}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-black text-gray-700">{report.present}</span>
                              <span className="text-gray-300 mx-1">/</span>
                              <span className="text-xs text-gray-400">{report.total}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  "text-xs font-black px-2 py-0.5 rounded-full",
                                  report.percentage >= 90 ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                                )}>
                                  {report.percentage}%
                                </span>
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#6f42c1]" 
                                    style={{ width: `${report.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                                {report.method}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="student-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <AnimatePresence mode="wait">
                {!selectedStudent ? (
                  <motion.div 
                    key="search-view"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                    {/* Search Student */}
                    <div className="relative group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
                      <input 
                        type="text"
                        placeholder="শিক্ষার্থীর নাম বা আইডি দিয়ে খুঁজুন..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-[2rem] shadow-xl shadow-purple-900/5 focus:ring-2 focus:ring-purple-200 font-bold placeholder:text-gray-300"
                      />
                    </div>

                    {/* Student List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStudents.map((student, i) => (
                        <motion.button
                          layoutId={student.id}
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className="text-left p-5 bg-white rounded-[2rem] border border-transparent hover:border-purple-200 transition-all shadow-sm hover:shadow-xl group flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-[#6f42c1] font-black shrink-0">
                               {student.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 leading-tight group-hover:text-[#6f42c1] transition-colors">
                                {student.name}
                              </h4>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                ID: {student.id} • Class {student.class}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                             <span className="text-xl font-black text-gray-900">{student.attendance}%</span>
                             <div className="w-12 h-1 bg-gray-100 rounded-full mt-1">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${student.attendance}%` }} />
                             </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="detail-view"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Back Button & Actions */}
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="flex items-center gap-2 text-sm font-black text-[#6f42c1] uppercase tracking-widest hover:translate-x-[-4px] transition-transform"
                      >
                        <ArrowLeft className="w-4 h-4" /> শিক্ষার্থী তালিকায় ফিরে যান
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => handleExport('Student')} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#6f42c1] shadow-sm">
                          <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => window.print()} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#6f42c1] shadow-sm">
                          <Printer className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Student Info Hero */}
                    <Card className="p-8 bg-gradient-to-br from-[#6f42c1] to-[#8a5fd6] border-none text-white relative overflow-hidden">
                       <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                          <PieChart className="w-48 h-48" />
                       </div>
                       <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                         <div className="w-24 h-24 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black">
                            {selectedStudent.name.charAt(0)}
                         </div>
                         <div className="text-center md:text-left space-y-1">
                           <h2 className="text-3xl font-black">{selectedStudent.name}</h2>
                           <div className="flex items-center justify-center md:justify-start gap-4">
                              <span className="text-xs font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">ID: {selectedStudent.id}</span>
                              <span className="text-xs font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Class: {selectedStudent.class}</span>
                           </div>
                         </div>
                         <div className="md:ml-auto text-center">
                            <div className="text-5xl font-black">{selectedStudent.attendance}%</div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Overall Attendance</div>
                         </div>
                       </div>
                    </Card>

                    {/* Student Logs */}
                    <section className="space-y-4">
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-4 h-4" /> হাজিরা রেকর্ড
                      </h3>
                      <div className="space-y-3">
                        {STUDENT_HISTORY.map((log, i) => (
                          <Card key={i} className="p-4 border-transparent shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                               <div className={cn(
                                 "w-10 h-10 rounded-2xl flex items-center justify-center",
                                 log.status === 'present' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                               )}>
                                  {log.status === 'present' ? <UserCheck className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-gray-900">{log.date}</p>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.method}</p>
                               </div>
                            </div>
                            <div className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                              log.status === 'present' ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : "bg-rose-100 text-rose-600 border border-rose-200"
                            )}>
                               {log.status === 'present' ? "Present" : "Absent"}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Info */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 p-4 rounded-3xl shadow-2xl flex items-center justify-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
             Data is synchronized with Google Sheets in real-time
           </p>
        </div>
      </div>
    </div>
  );
}

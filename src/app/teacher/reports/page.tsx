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
  ArrowLeft,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

/**
 * Teacher Reports Page - MOBILE-HAJIRA SaaS
 * Provides detailed attendance analytics for classes and individual students.
 * Optimized for perfect responsiveness and no content overlap.
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
    <div className="min-h-screen bg-gray-50 pb-32 font-bengali overflow-x-hidden">
      {/* Header Section */}
      <div className="bg-[#6f42c1] text-white pt-12 pb-28 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
        {/* Decorations */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 -z-0"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl -ml-10 -mb-10 -z-0"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10">
                <BarChart3 className="w-4 h-4 text-purple-200" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Analytics Hub</span>
             </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">হাজিরা রিপোর্ট</h1>
            <p className="text-purple-100 text-sm md:text-lg opacity-90 font-medium">উপস্থিতি এবং অনুপস্থিতির বিস্তারিত পরিসংখ্যান দেখুন</p>
          </div>

          {/* Date Selector - Refined for mobile */}
          <div className="flex flex-wrap gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            {["Today", "This Week", "This Month"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateRange === range 
                    ? "bg-white text-[#6f42c1] shadow-xl scale-105" 
                    : "text-white/70 hover:text-white"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 relative z-20">
        
        {/* Tab Navigation - Fixed overlap and improved spacing */}
        <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-purple-900/10 flex items-center justify-between border border-gray-100 -mt-10 lg:-mt-12 backdrop-blur-xl bg-white/95">
          <button
            onClick={() => { setActiveTab("class"); setSelectedStudent(null); }}
            className={cn(
              "flex-1 py-4 md:py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all",
              activeTab === "class" ? "bg-purple-50 text-[#6f42c1] shadow-sm ring-1 ring-purple-100" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm font-black uppercase tracking-wider">ক্লাস রিপোর্ট</span>
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={cn(
              "flex-1 py-4 md:py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all",
              activeTab === "student" ? "bg-purple-50 text-[#6f42c1] shadow-sm ring-1 ring-purple-100" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm font-black uppercase tracking-wider">শিক্ষার্থী রিপোর্ট</span>
          </button>
        </div>

        {/* Content Section - More padding to prevent any clipping */}
        <div className="mt-12 mb-16">
          <AnimatePresence mode="wait">
            {activeTab === "class" ? (
              <motion.div
                key="class-tab"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {/* Class Filter & Global Actions */}
                <section className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 w-full sm:w-auto">
                    <div className="p-2 bg-purple-100 rounded-xl text-[#6f42c1]">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Class</span>
                       <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-transparent border-none p-0 focus:ring-0 font-black text-gray-900 text-lg cursor-pointer min-w-[100px]"
                      >
                        {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full sm:w-auto justify-end">
                    <button 
                      onClick={() => handleExport('Excel')} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-14 px-6 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-[#6f42c1] transition-all shadow-sm hover:shadow-md"
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-14 px-6 bg-[#6f42c1] text-white rounded-2xl transition-all shadow-xl shadow-purple-900/20 hover:scale-105"
                    >
                      <Printer className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Print</span>
                    </button>
                  </div>
                </section>

                {/* Statistics Grid - No overlap cards */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "মোট শিক্ষার্থী", value: "৫০", icon: Users, color: "text-blue-600 bg-blue-50" },
                    { label: "আজ উপস্থিত", value: "৪৫", icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
                    { label: "গড় উপস্থিতি", value: "৯০%", icon: PieChart, color: "text-purple-600 bg-purple-50" },
                    { label: "অনুপস্থিত", value: "০৫", icon: UserMinus, color: "text-rose-600 bg-rose-50" },
                  ].map((stat, i) => (
                    <Card key={i} className="p-6 border-none shadow-xl shadow-purple-900/5 hover:shadow-2xl transition-all h-full">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className={cn("p-4 rounded-2xl", stat.color)}>
                          <stat.icon className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</p>
                          <h4 className="text-3xl font-black text-gray-900">{stat.value}</h4>
                        </div>
                      </div>
                    </Card>
                  ))}
                </section>

                {/* Data Table Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> হাজিরা ইতিহাস ডায়েরি
                    </h3>
                  </div>
                  
                  <Card className="overflow-hidden border-none shadow-2xl shadow-purple-900/5 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ ও সময়</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">উপস্থিত শিক্ষার্থী</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">পরিসংখ্যান</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">পদ্ধতি</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {CLASS_REPORTS.map((report, i) => (
                            <tr key={i} className="hover:bg-purple-50/30 transition-colors group">
                              <td className="px-8 py-6 font-bold text-gray-900">
                                <div className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-[#6f42c1] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                   {report.date}
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-lg font-black text-gray-800">{report.present}</span>
                                <span className="text-gray-300 mx-2 text-sm">out of</span>
                                <span className="text-sm text-gray-400 font-bold">{report.total}</span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                                  <span className={cn(
                                    "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tighter shadow-sm",
                                    report.percentage >= 90 ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : "bg-purple-100 text-purple-600 border border-purple-200"
                                  )}>
                                    {report.percentage}% Attendance
                                  </span>
                                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden p-0.5">
                                    <div 
                                      className="h-full bg-gradient-to-r from-[#6f42c1] to-purple-400 rounded-full" 
                                      style={{ width: `${report.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
                                  <BarChart3 className="w-3 h-3" />
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-10"
              >
                <AnimatePresence mode="wait">
                  {!selectedStudent ? (
                    <motion.div 
                      key="search-view"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Robust Search Box */}
                      <div className="relative group max-w-2xl mx-auto">
                        <div className="absolute inset-0 bg-[#6f42c1]/5 blur-2xl rounded-full scale-95 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors z-10" />
                        <input 
                          type="text"
                          placeholder="শিক্ষার্থীর নাম বা আইডি দিয়ে খুঁজুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-16 pr-8 py-6 bg-white border-none rounded-[2.5rem] shadow-2xl shadow-purple-900/5 focus:ring-4 focus:ring-purple-100 font-bold text-lg placeholder:text-gray-300 relative z-10"
                        />
                      </div>

                      {/* Student Card Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                        {filteredStudents.map((student, i) => (
                          <motion.button
                            layoutId={student.id}
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className="text-left p-6 bg-white rounded-[2.5rem] border-2 border-transparent hover:border-[#6f42c1]/10 transition-all shadow-xl shadow-purple-900/5 hover:shadow-2xl group flex items-center justify-between"
                          >
                            <div className="flex items-center gap-5">
                              <div className="w-16 h-16 rounded-[1.5rem] bg-purple-50 group-hover:bg-[#6f42c1] flex items-center justify-center text-[#6f42c1] group-hover:text-white font-black text-xl shrink-0 transition-all">
                                 {student.name.charAt(0)}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-black text-gray-900 text-lg leading-tight group-hover:text-[#6f42c1] transition-colors">
                                  {student.name}
                                </h4>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {student.id}</span>
                                   <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                   <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-widest">Class {student.class}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-2">
                               <div className="flex flex-col items-end">
                                  <span className="text-2xl font-black text-gray-900 leading-none">{student.attendance}%</span>
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Attendance</span>
                               </div>
                               <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${student.attendance}%` }} />
                               </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>

                      {filteredStudents.length === 0 && (
                        <div className="py-20 flex flex-col items-center text-center space-y-4">
                           <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                              <Search className="w-10 h-10 text-gray-300" />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-gray-900">কোনো শিক্ষার্থী পাওয়া যায়নি</h3>
                              <p className="text-sm text-gray-400 font-medium">অনুগ্রহ করে অন্য নাম বা আইডি লিখে চেষ্টা করুন।</p>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="detail-view"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-10"
                    >
                      {/* Back & Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <button 
                          onClick={() => setSelectedStudent(null)}
                          className="w-full sm:w-auto h-14 pl-4 pr-8 bg-white rounded-2xl flex items-center justify-center gap-3 text-sm font-black text-[#6f42c1] uppercase tracking-widest shadow-xl shadow-purple-900/5 hover:-translate-x-1 transition-all"
                        >
                          <ArrowLeft className="w-5 h-5" /> শিক্ষার্থী তালিকায় ফিরে যান
                        </button>
                        <div className="flex gap-4 w-full sm:w-auto">
                          <button onClick={() => handleExport('Detailed')} className="flex-1 sm:flex-none h-14 w-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#6f42c1] hover:shadow-lg transition-all">
                            <Download className="w-6 h-6" />
                          </button>
                          <button onClick={() => window.print()} className="flex-1 sm:flex-none h-14 w-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#6f42c1] hover:shadow-lg transition-all">
                            <Printer className="w-6 h-6" />
                          </button>
                        </div>
                      </div>

                      {/* Profile Card - Fixed Z-index and responsive layout */}
                      <Card className="p-8 sm:p-12 bg-gradient-to-br from-[#6f42c1] to-[#8a5fd6] border-none text-white relative overflow-hidden shadow-2xl shadow-purple-900/30">
                         {/* Abstract background */}
                         <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/2 -translate-y-1/2">
                            <PieChart className="w-96 h-96" />
                         </div>
                         
                         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-14">
                           <div className="w-32 h-32 rounded-[2.5rem] bg-white text-[#6f42c1] flex items-center justify-center text-5xl font-black shadow-2xl">
                              {selectedStudent.name.charAt(0)}
                           </div>
                           <div className="text-center md:text-left space-y-3">
                             <div className="space-y-1">
                               <h2 className="text-3xl md:text-5xl font-black leading-tight">{selectedStudent.name}</h2>
                               <p className="text-purple-100 font-medium md:text-xl">ID: {selectedStudent.id} • Class {selectedStudent.class}</p>
                             </div>
                             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-100 px-4 py-1.5 rounded-full border border-emerald-500/20">Verified Profile</span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/10">Regular Student</span>
                             </div>
                           </div>
                           <div className="md:ml-auto flex flex-col items-center md:items-end justify-center">
                              <div className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-2">
                                {selectedStudent.attendance}
                                <span className="text-3xl md:text-5xl opacity-50">%</span>
                              </div>
                              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">Monthly Attendance</p>
                           </div>
                         </div>
                      </Card>

                      {/* Detailed History Logs */}
                      <section className="space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
                          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4" /> পূর্ণাঙ্গ হাজিরা তালিকা
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {STUDENT_HISTORY.map((log, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i}
                            >
                              <Card className="p-6 border-none shadow-xl shadow-purple-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-white transition-all group">
                                <div className="flex items-center gap-6">
                                  <div className={cn(
                                    "w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                                    log.status === 'present' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                  )}>
                                      {log.status === 'present' ? <UserCheck className="w-7 h-7" /> : <UserMinus className="w-7 h-7" />}
                                  </div>
                                  <div>
                                      <p className="text-lg font-black text-gray-900 leading-tight">{log.date}</p>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                        <BarChart3 className="w-3 h-3" /> Method: {log.method}
                                      </p>
                                  </div>
                                </div>
                                
                                <div className={cn(
                                  "self-start sm:self-auto text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-2xl border transition-all",
                                  log.status === 'present' 
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-900/5 shadow-xl" 
                                    : "bg-rose-50 text-rose-600 border-rose-200 shadow-rose-900/5 shadow-xl"
                                )}>
                                  {log.status === 'present' ? "Present" : "Absent"}
                                </div>
                              </Card>
                            </motion.div>
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
      </div>

      {/* Floating Interactive Footer - Optimized for Z-index and no overlap */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md pointer-events-none z-50">
        <div className="bg-white/90 backdrop-blur-2xl border border-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(111,66,193,0.15)] flex items-center justify-center gap-4 border-b-4 border-[#6f42c1]/20">
           <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] leading-tight text-center">
             Live Cloud Sync: <span className="text-[#6f42c1]">Active</span>
           </p>
        </div>
      </div>
    </div>
  );
}

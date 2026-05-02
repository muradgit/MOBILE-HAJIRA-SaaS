"use client";

import React from "react";
import { 
  Users, 
  Calendar, 
  Clock, 
  BookOpen, 
  ArrowUpRight, 
  PlusCircle, 
  FileText, 
  CreditCard,
  TrendingUp,
  Award,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";
import { normalizeRole } from "@/src/lib/auth-utils";

/**
 * Teacher Dashboard - MOBILE-HAJIRA SaaS
 * Main portal for teachers to manage classes, view stats, and take attendance.
 * Refined for perfect responsiveness and no card overlapping.
 */

// Mock stats - in a real-world scenario, these would be fetched based on teacher_id
const DASHBOARD_STATS = [
  {
    label: "অ্যাসাইনকৃত ক্লাস",
    value: "০৮",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-600",
    trend: "+২ এই সপ্তাহে",
  },
  {
    label: "মোট শিক্ষার্থী",
    value: "৪৫০",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
    trend: "৫টি সেকশন",
  },
  {
    label: "আজকের হাজিরা",
    value: "১২৪",
    icon: Calendar,
    color: "bg-emerald-100 text-emerald-600",
    trend: "৮৫% উপস্থিতি",
  },
  {
    label: "সময় সাশ্রয়",
    value: "১২ঘ",
    icon: Clock,
    color: "bg-orange-100 text-orange-600",
    trend: "এই মাসে",
  },
];

const QUICK_ACTIONS = [
  {
    title: "হাজিরা নিন",
    subtitle: "Take Attendance",
    icon: PlusCircle,
    href: "/teacher/attendance",
    color: "bg-[#6f42c1] text-white shadow-purple-600/20",
  },
  {
    title: "আমার শিক্ষার্থী",
    subtitle: "My Students",
    icon: Users,
    href: "/teacher/students",
    color: "bg-white text-gray-700 border-gray-100 shadow-sm",
  },
  {
    title: "রিপোর্ট দেখুন",
    subtitle: "Attendance Reports",
    icon: FileText,
    href: "/teacher/reports",
    color: "bg-white text-gray-700 border-gray-100 shadow-sm",
  },
  {
    title: "আইডি কার্ড",
    subtitle: "Digital ID Cards",
    icon: CreditCard,
    href: "/teacher/id-cards",
    color: "bg-white text-gray-700 border-gray-100 shadow-sm",
  },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    class: "দশম শ্রেণী (ক শাখা)",
    subject: "গণিত",
    date: "আজ, বেলা ১১:৩০",
    count: 42,
    status: "সফল",
  },
  {
    id: 2,
    class: "নবম শ্রেণী (খ শাখা)",
    subject: "বিজ্ঞান",
    date: "আজ, সকাল ১০:১৫",
    count: 38,
    status: "সফল",
  },
  {
    id: 3,
    class: "অষ্টম শ্রেণী (গ শাখা)",
    subject: "ইংরেজি",
    date: "গতকাল, দুপুর ২:০০",
    count: 45,
    status: "সফল",
  },
];

export default function TeacherDashboard() {
  const { userData, loading } = useAuth();
  const { activeRole } = useUserStore();

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  const nActiveRole = normalizeRole(activeRole);
  const nUserRole = normalizeRole(userData?.role);
  const isAuthorized = nActiveRole === "teacher" || nUserRole === "super_admin" || nUserRole === "institute_admin";

  if (!userData || !isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <Award className="w-10 h-10 text-red-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 font-bengali">অ্যাক্সেস সংরক্ষিত</h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            আপনার এই পেজটি দেখার অনুমতি নেই। অনুগ্রহ করে আপনার অ্যাকাউন্টের ধরণ যাচাই করুন।
          </p>
        </div>
        <Link 
          href="/" 
          className="px-8 py-3 bg-[#6f42c1] text-white rounded-2xl font-black text-sm uppercase tracking-widest"
        >
          প্রচ্ছদে ফিরে যান
        </Link>
      </div>
    );
  }

  const teacherName = userData.name || userData.nameBN || "সম্মানিত শিক্ষক";

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-bengali overflow-x-hidden">
      {/* Welcome Header */}
      <div className="bg-[#6f42c1] text-white pt-12 pb-32 px-6 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
        {/* Background Decorations - Lowered Z-index to ensure they stay back */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 -z-0"></div>
        <div className="absolute top-1/2 left-0 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl -ml-20 -z-0"></div>
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10"
            >
              <Award className="w-4 h-4 text-yellow-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-100">Verified Educator</span>
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              স্বাগতম, <br className="sm:hidden" />
              <span className="text-purple-200 underline decoration-white/20 decoration-4 underline-offset-4">{teacherName}</span> {nActiveRole === 'teacher' ? 'স্যার' : ''}
            </h1>
            <p className="text-purple-100 text-sm md:text-lg opacity-90 font-medium max-w-lg">
              মোবাইল-হাজিরায় আপনাকে স্বাগতম। আজকের উপস্থিতি এবং ক্লাসের তথ্যগুলো দ্রুত যাচাই করে নিন।
            </p>
          </div>
          
          {/* Profile Section with better mobile layout */}
          <div className="flex items-center -space-x-4">
             {userData.profile_image ? (
                <div className="w-16 h-16 rounded-3xl border-4 border-[#6f42c1] overflow-hidden bg-white shadow-2xl">
                  <img 
                    src={userData.profile_image} 
                    alt="profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
             ) : (
               [1,2,3].map(i => (
                 <div key={i} className="w-12 h-12 md:w-14 md:h-14 rounded-3xl border-4 border-[#6f42c1] overflow-hidden bg-purple-200 shadow-xl">
                   <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123 + (userData.user_id || '')}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover"
                    />
                 </div>
               ))
             )}
             <div className="w-12 h-12 md:w-14 md:h-14 rounded-3xl border-4 border-[#6f42c1] bg-white flex items-center justify-center text-[#6f42c1] font-black text-xs shadow-2xl relative z-10">
               {userData.teacher_id || "ID"}
             </div>
          </div>
        </div>
      </div>

      {/* Main Content - Improved spacing and responsive grids */}
      <div className="max-w-5xl mx-auto px-6 -mt-20 space-y-12 relative z-20">
        
        {/* Statistics Grid - Prevents overlap by using robust grid and padding */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DASHBOARD_STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <Card className="p-5 md:p-6 h-full flex flex-col justify-between border-none shadow-xl shadow-purple-900/5 hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="space-y-4">
                    <div className={cn("p-4 rounded-2xl inline-flex", stat.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                        {stat.label}
                      </p>
                      <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">
                        {stat.value}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-[10px] md:text-[11px] font-bold text-gray-400">
                      {stat.trend}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Quick Actions - Larger touch targets and cleaner grid */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
               সরাসরি কাজ করুন
            </h2>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {QUICK_ACTIONS.map((action, index) => {
               const Icon = action.icon;
               return (
                 <Link href={action.href} key={action.title} className="block">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 border-2 transition-all cursor-pointer h-full shadow-lg",
                        action.color
                      )}
                    >
                      <div className={cn(
                        "p-5 rounded-2xl transition-transform group-hover:scale-110",
                        action.href === "/teacher/attendance" ? "bg-white/20" : "bg-purple-100/50"
                      )}>
                         <Icon className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className={cn(
                          "font-black text-base",
                          action.href === "/teacher/attendance" ? "text-white" : "text-gray-900"
                        )}>
                          {action.title}
                        </h3>
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest opacity-70",
                          action.href === "/teacher/attendance" ? "text-purple-100" : "text-gray-400"
                        )}>
                          {action.subtitle}
                        </p>
                      </div>
                    </motion.div>
                 </Link>
               )
             })}
          </div>
        </section>

        {/* Bottom Section: Activity & Tips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Recent Activity - Takes more space on desktop */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                   সাম্প্রতিক হাজিরা
                </h2>
              </div>
              <Link href="/teacher/reports" className="text-[11px] font-black text-[#6f42c1] uppercase tracking-widest hover:underline underline-offset-4">
                সব রিপোর্ট দেখুন
              </Link>
            </div>
            
            <div className="space-y-4">
              {RECENT_ACTIVITY.map((activity) => (
                <Card key={activity.id} className="p-5 border-transparent shadow-sm hover:shadow-xl hover:bg-white transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 group-hover:bg-[#6f42c1] flex items-center justify-center transition-all">
                        <BookOpen className="w-7 h-7 text-[#6f42c1] group-hover:text-white transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-gray-900 text-base md:text-lg leading-tight">
                          {activity.class}
                        </h4>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-md uppercase tracking-wider">
                            {activity.subject}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {activity.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                       <span className="block text-2xl font-black text-gray-900 leading-none">
                         {activity.count}
                       </span>
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">শিক্ষার্থী</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Sidebar: Motivational / Info Card */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-[#6f42c1] rounded-full"></div>
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                 গুরুত্বপূর্ণ টিপস
              </h2>
            </div>
            <Card className="p-8 bg-gradient-to-br from-[#6f42c1] to-[#8a5fd6] border-none text-white overflow-hidden relative shadow-2xl shadow-purple-900/40">
               <div className="absolute -right-6 -bottom-6 opacity-20 transform rotate-12">
                 <Award className="w-32 h-32" />
               </div>
               <div className="relative z-10 space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-xl leading-tight">ডিজিটাল আইডি কার্ড</h3>
                    <p className="text-sm text-purple-100 font-medium leading-relaxed opacity-90 font-bengali">
                      শিক্ষার্থীদের ডিজিটাল আইডি কার্ড ব্যবহার করে দ্রুত হাজিরা নিশ্চিত করুন। এটি নির্ভুল এবং আধুনিক পদ্ধতি।
                    </p>
                  </div>
                  <Link href="/teacher/id-cards" className="flex items-center justify-center w-full py-4 bg-white text-[#6f42c1] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-purple-50 transition-all hover:scale-[1.02] active:scale-95">
                    তৈরি করতে ক্লিক করুন
                  </Link>
               </div>
            </Card>
          </section>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-8 right-8 lg:hidden z-50">
         <Link href="/teacher/attendance">
           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             className="w-18 h-18 bg-[#6f42c1] text-white rounded-full flex items-center justify-center shadow-2xl shadow-purple-900/40 border-4 border-white/20 backdrop-blur-sm"
           >
             <PlusCircle className="w-9 h-9" />
           </motion.button>
         </Link>
      </div>
    </div>
  );
}

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
    color: "bg-[#6f42c1] text-white shadow-purple-200",
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
    <div className="min-h-screen bg-gray-50 pb-20 font-bengali">
      {/* Welcome Header */}
      <div className="bg-[#6f42c1] text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute top-1/2 left-0 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl -ml-20"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10"
            >
              <Award className="w-4 h-4 text-yellow-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-100">Verified Teacher</span>
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              স্বাগতম, <br className="md:hidden" />
              <span className="text-purple-200">{teacherName}</span> {nActiveRole === 'teacher' ? 'স্যার' : ''}
            </h1>
            <p className="text-purple-100 text-sm md:text-base opacity-80 font-medium">
              আপনার ড্যাশবোর্ড এখন আপ-টু-ডেট। আজকের কাজগুলো শুরু করুন।
            </p>
          </div>
          
          <div className="flex -space-x-3">
             {userData.profile_image ? (
                <div className="w-14 h-14 rounded-2xl border-4 border-[#6f42c1] overflow-hidden bg-white shadow-xl">
                  <img 
                    src={userData.profile_image} 
                    alt="profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
             ) : (
               [1,2,3,4].map(i => (
                 <div key={i} className="w-12 h-12 rounded-2xl border-4 border-[#6f42c1] overflow-hidden bg-purple-200 shadow-xl">
                   <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123 + (userData.user_id || '')}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover"
                    />
                 </div>
               ))
             )}
             <div className="w-12 h-12 rounded-2xl border-4 border-[#6f42c1] bg-white flex items-center justify-center text-[#6f42c1] font-black text-xs shadow-xl">
               {userData.teacher_id || "ID"}
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 space-y-8">
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {DASHBOARD_STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 md:p-5 h-full flex flex-col justify-between border-transparent hover:border-purple-200 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="space-y-3">
                    <div className={cn("p-3 rounded-2xl inline-flex", stat.color)}>
                      <Icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest leading-tight">
                        {stat.label}
                      </p>
                      <h3 className="text-xl md:text-2xl font-black text-gray-900 mt-0.5">
                        {stat.value}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] md:text-[10px] font-bold text-gray-400">
                      {stat.trend}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-purple-600" /> সরাসরি কাজ করুন
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             {QUICK_ACTIONS.map((action, index) => {
               const Icon = action.icon;
               return (
                 <Link href={action.href} key={action.title}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-3 border-2 transition-all cursor-pointer h-full",
                        action.color
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl",
                        action.href === "/teacher/attendance" ? "bg-white/20" : "bg-purple-50"
                      )}>
                         <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-black text-sm whitespace-nowrap",
                          action.href === "/teacher/attendance" ? "text-white" : "text-gray-900"
                        )}>
                          {action.title}
                        </h3>
                        <p className={cn(
                          "text-[9px] font-bold uppercase tracking-widest opacity-60",
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

        {/* Middle Section: Recent Activity & Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" /> সাম্প্রতিক হাজিরা
              </h2>
              <Link href="/teacher/reports" className="text-[10px] font-black text-[#6f42c1] uppercase tracking-widest hover:underline">
                সব দেখুন
              </Link>
            </div>
            
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((activity) => (
                <Card key={activity.id} className="p-4 border-transparent hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:bg-white transition-colors">
                        <BookOpen className="w-6 h-6 text-[#6f42c1]" />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm md:text-base leading-tight">
                          {activity.class}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded uppercase">
                            {activity.subject}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {activity.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="block text-lg font-black text-gray-900 leading-none">
                         {activity.count}
                       </span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter shrink-0">Students</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Side Info/Card */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" /> গুরুত্বপূর্ণ টিপস
            </h2>
            <Card className="p-6 bg-gradient-to-br from-[#6f42c1] to-[#8a5fd6] border-none text-white overflow-hidden relative">
               <div className="absolute -right-6 -bottom-6 opacity-10">
                 <Award className="w-32 h-32" />
               </div>
               <div className="relative z-10 space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg leading-tight">ডিজিটাল আইডি কার্ড</h3>
                    <p className="text-xs text-purple-100 font-medium leading-relaxed opacity-90">
                      শিক্ষার্থীদের ডিজিটাল আইডি কার্ড ব্যবহার করে দ্রুত হাজিরা নিশ্চিত করুন। এতে ভুলের সম্ভাবনা একদমই নেই।
                    </p>
                  </div>
                  <Link href="/teacher/id-cards" className="block w-full py-3 bg-white text-[#6f42c1] rounded-2xl font-black text-xs text-center uppercase tracking-widest shadow-xl shadow-purple-900/40 hover:bg-purple-50 transition-colors">
                    তৈরি করুন
                  </Link>
               </div>
            </Card>
          </section>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 lg:hidden z-50">
         <Link href="/teacher/attendance">
           <motion.button
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.9 }}
             className="w-16 h-16 bg-[#6f42c1] text-white rounded-full flex items-center justify-center shadow-2xl shadow-purple-600/40"
           >
             <PlusCircle className="w-8 h-8" />
           </motion.button>
         </Link>
      </div>
    </div>
  );
}

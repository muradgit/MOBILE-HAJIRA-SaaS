"use client";

import React from "react";
import Link from "next/link";
import { 
  Zap, 
  QrCode, 
  Users, 
  Database, 
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Star,
  Play
} from "lucide-react";

import { cn } from "@/src/lib/utils";

/**
 * Modern High-Converting Landing Page for MOBILE-HAJIRA-SaaS
 */
export default function LandingPage() {
  return (
    <div className="bg-white -mt-8 -mx-4 sm:-mx-10">
      
      {/* 1. Hero Section */}
      <section className="relative pt-20 pb-20 px-6 sm:px-10 max-w-7xl mx-auto text-center space-y-12 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-purple-50/50 to-transparent -z-10 pointer-events-none" />
        
        <div className="space-y-4 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="inline-flex items-center gap-2 bg-purple-100/50 text-[#6f42c1] px-4 py-2 rounded-full border border-purple-200">
             <Zap className="w-4 h-4 fill-[#6f42c1]" />
             <span className="text-[10px] font-black uppercase tracking-widest">রেজিস্ট্রেশনে ১০০ ক্রেডিট বোনাস!</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-gray-900 font-bengali leading-[1.1] tracking-tight">
            খাতা-কলমের যুগ শেষ, এক ক্লিকেই <span className="text-[#6f42c1]">স্মার্ট হাজিরা!</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed font-bengali">
            মাত্র ২ মিনিটে ক্লাসের হাজিরা নিন, অটোমেটিক রিপোর্ট তৈরি করুন এবং জিরো-কস্ট স্টোরেজে ডাটা ব্যাকআপ রাখুন।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/auth/register"
            className="w-full sm:w-auto bg-[#6f42c1] text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            শুরু করুন <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/auth/login"
            className="w-full sm:w-auto bg-white text-[#6f42c1] border-2 border-purple-100 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
          >
            লগইন <Play className="w-4 h-4 fill-[#6f42c1]" />
          </Link>
        </div>

        {/* Hero Visual */}
        <div className="pt-16 max-w-5xl mx-auto relative group">
           <div className="absolute inset-0 bg-purple-500/20 blur-[100px] -z-10 group-hover:blur-[120px] transition-all" />
           <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl p-4 sm:p-8 aspect-video flex items-center justify-center">
              <div className="text-center space-y-4">
                 <Smartphone className="w-24 h-24 text-[#6f42c1] mx-auto animate-bounce" />
                 <p className="text-xl font-black text-gray-900 font-bengali uppercase tracking-widest">Mobile Optimized Experience</p>
              </div>
           </div>
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className="bg-gray-50/50 py-24">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "প্রতিষ্ঠান", value: "৫০০+", icon: Smartphone },
              { label: "শিক্ষক", value: "৫০০০+", icon: Users },
              { label: "শিক্ষার্থী", value: "৫০,০০০+", icon: Users },
              { label: "রিপোর্ট", value: "১,০০,০০০+", icon: Database },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-2">
                 <h3 className="text-4xl md:text-5xl font-black text-gray-900">{stat.value}</h3>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
         </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto space-y-24">
         <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 font-bengali tracking-tight">সব কিছু থাকছে এক জায়গায়</h2>
            <p className="text-gray-500 font-medium font-bengali">আপনার প্রতিষ্ঠানের প্রতিটি কার্যক্রম হবে এখন ডিজিটাল এবং স্মার্ট।</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "স্মার্ট QR স্ক্যান", desc: "শিক্ষার্থীরা তাদের আইডি কার্ড স্ক্যান করেই হাজিরা দিতে পারবে।", icon: QrCode, color: "bg-purple-50 text-purple-600" },
              { title: "জিরো-কস্ট স্টোরেজ", desc: "সব ডাটা থাকে আপনার পার্সোনাল গুগল ড্রাইভে, ফলে ডাটা লস্টের ঝুঁকি নেই।", icon: Database, color: "bg-blue-50 text-blue-600" },
              { title: "রিয়েল-টাইম রিপোর্ট", desc: "এক ক্লিকেই আপনার মাসিক বা বার্ষিক হাজিরা রিপোর্ট তৈরি করুন।", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600" },
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-white border border-gray-50 shadow-xl shadow-gray-200/40 space-y-6 hover:translate-y-[-10px] transition-all">
                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", f.color)}>
                    <f.icon className="w-7 h-7" />
                 </div>
                 <h3 className="text-xl font-black text-gray-900 font-bengali">{f.title}</h3>
                 <p className="text-sm text-gray-500 leading-relaxed font-bengali font-medium group-hover:text-gray-900 transition-colors">{f.desc}</p>
                 <button className="text-[10px] font-black uppercase text-[#6f42c1] tracking-widest flex items-center gap-2">আরও জানুন <ArrowRight className="w-3 h-3" /></button>
              </div>
            ))}
         </div>
      </section>

      {/* 4. Pricing / Final CTA Section */}
      <section className="mb-24 px-6 max-w-6xl mx-auto">
         <div className="bg-[#6f42c1] rounded-[3rem] px-8 py-20 md:p-24 text-center text-white space-y-10 relative overflow-hidden shadow-2xl shadow-purple-500/40">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

            <div className="space-y-4">
               <div className="flex items-center justify-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
               </div>
               <h2 className="text-3xl md:text-5xl font-black font-bengali">আজই আপনার প্রতিষ্ঠানকে স্মার্ট করুন!</h2>
               <p className="text-lg md:text-xl text-purple-100 font-medium max-w-xl mx-auto font-bengali tracking-tight">নিবন্ধন করলেই পাবেন ১০০ ক্রেডিট বোনাস। দেরি না করে আজই যুক্ত হোন আমাদের সাথে।</p>
            </div>
            
            <Link 
              href="/auth/register"
              className="inline-block bg-white text-[#6f42c1] px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              ফ্রি রেজিস্ট্রেশন করুন
            </Link>
         </div>
      </section>
    </div>
  );
}

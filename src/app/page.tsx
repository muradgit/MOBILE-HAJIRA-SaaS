"use client";

import React from "react";
import Link from "next/link";
import { 
  Zap, 
  QrCode, 
  Users, 
  Database, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Globe,
  Star,
  Play
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";

/**
 * Modern High-Converting Landing Page
 * Designed for MOBILE-HAJIRA-SaaS overhaul.
 */
export default function LandingPage() {
  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      
      {/* 1. Hero Section */}
      <section className="relative pt-10 pb-20 px-6 sm:px-10 max-w-7xl mx-auto overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-50 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-40" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-10 max-w-4xl mx-auto py-12 md:py-24">
          <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-100 animate-in fade-in slide-in-from-top-4 duration-1000">
             <Zap className="w-4 h-4 text-[#6f42c1] fill-[#6f42c1]" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6f42c1]">রেজিস্ট্রেশনে ১০০ ক্রেডিট ফ্রি!</span>
          </div>

          <h1 className="text-4xl md:text-7xl font-black text-gray-900 font-bengali leading-[1.1] tracking-tight">
            খাতা-কলমের যুগ শেষ, এক ক্লিকেই <span className="text-[#6f42c1] relative">স্মার্ট হাজিরা! <span className="absolute left-0 bottom-2 w-full h-3 bg-purple-100 -z-10" /></span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl leading-relaxed font-bengali">
            সাগরিকা স্বাগতম! মাত্র ২ মিনিটে ক্লাসের হাজিরা নিন, অটোমেটিক রিপোর্ট তৈরি করুন এবং জিরো-কস্ট স্টোরেজে ডাটা ব্যাকআপ রাখুন।
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              href="/auth/register"
              className="w-full sm:w-auto bg-[#6f42c1] text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              এখনই শুরু করুন <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/auth/login"
              className="w-full sm:w-auto bg-white text-gray-900 border border-gray-100 px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              লগইন <Play className="w-4 h-4 fill-gray-900" />
            </Link>
          </div>

          {/* Social Proof */}
          <div className="pt-8 flex flex-col items-center gap-4">
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                   <div key={i} className="w-10 h-10 border-2 border-white rounded-full bg-gray-200 overflow-hidden shadow-sm">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" />
                   </div>
                ))}
                <div className="w-10 h-10 border-2 border-white rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-black">+৫০</div>
             </div>
             <p className="text-xs font-bold text-gray-400 font-bengali tracking-tight">৫০+ শিক্ষা প্রতিষ্ঠান আমাদের উপর আস্থা রাখছে!</p>
          </div>
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className="bg-gray-50/50 py-20">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "প্রতিষ্ঠান", value: "৫০০+", color: "purple" },
              { label: "শিক্ষক", value: "৫০০০+", color: "blue" },
              { label: "শিক্ষার্থী", value: "৫০০০০+", color: "emerald" },
              { label: "রিপোর্ট জেনারেটেড", value: "১০০০০+", color: "orange" },
            ].map((stat, i) => (
              <div key={i} className="text-center space-y-2 group">
                 <h3 className="text-3xl md:text-5xl font-black text-gray-900 group-hover:scale-110 transition-transform">{stat.value}</h3>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
         </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto space-y-20">
         <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 font-bengali tracking-tight">সব কিছু থাকছে এক জায়গায়</h2>
            <p className="text-gray-500 font-medium font-bengali">আপনার প্রতিষ্ঠানের প্রতিটি কার্যক্রম হবে এখন ডিজিটাল এবং স্মার্ট।</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "স্মার্ট QR স্ক্যান", desc: "শিক্ষার্থীরা তাদের আইডি কার্ড স্ক্যান করেই হাজিরা দিতে পারবে।", icon: QrCode, color: "from-purple-100 to-purple-50 text-purple-600" },
              { title: "জিরো-কস্ট স্টোরেজ", desc: "সব ডাটা থাকে আপনার পার্সোনাল গুগল ড্রাইভে, ফলে ডাটা লস্টের ঝুঁকি নেই।", icon: Database, color: "from-blue-100 to-blue-50 text-blue-600" },
              { title: "রিয়েল-টাইম রিপোর্ট", desc: "এক ক্লিকেই আপনার মাসিক বা বার্ষিক হাজিরা রিপোর্ট তৈরি করুন।", icon: ShieldCheck, color: "from-emerald-100 to-emerald-50 text-emerald-600" },
            ].map((f, i) => (
              <Card key={i} className="p-8 border-transparent bg-white shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all rounded-[2rem] flex flex-col gap-6 group">
                 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-all group-hover:rotate-12", f.color)}>
                    <f.icon className="w-7 h-7 transition-colors" />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-xl font-black text-gray-900 font-bengali">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed font-bengali font-medium">{f.desc}</p>
                 </div>
                 <div className="pt-4 border-t border-gray-50 mt-auto">
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase text-[#6f42c1] tracking-widest hover:translate-x-2 transition-transform">
                       বিস্তারিত দেখুন <ArrowRight className="w-3 h-3" />
                    </button>
                 </div>
              </Card>
            ))}
         </div>
      </section>

      {/* 4. Pricing / CTA Section */}
      <section className="py-24 px-6">
         <div className="max-w-5xl mx-auto rounded-[3rem] bg-[#6f42c1] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-purple-500/40">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

            <div className="relative z-10 flex flex-col items-center space-y-8">
               <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
               </div>
               <h2 className="text-3xl md:text-6xl font-black font-bengali">আজই আপনার প্রতিষ্ঠানকে স্মার্ট করুন!</h2>
               <p className="text-lg md:text-xl text-purple-100 font-medium max-w-xl font-bengali">নিবন্ধন করলেই পাবেন ১০০ ক্রেডিট বোনাস। দেরি না করে আজই যুক্ত হোন আমাদের সাথে।</p>
               
               <Link 
                 href="/auth/register"
                 className="bg-white text-[#6f42c1] px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-purple-50 transition-all shadow-xl"
               >
                 ফ্রি রেজিস্ট্রেশন করুন
               </Link>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 text-center space-y-4">
         <div className="flex flex-col items-center">
            <h4 className="text-sm font-black text-[#6f42c1] tracking-tighter uppercase mb-1">MOBILE-HAJIRA</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 Digital Attendance Suite</p>
         </div>
         <div className="flex flex-col items-center gap-1 pt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Developed By</p>
            <a href="https://muradkhank31.com" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-[#6f42c1] hover:underline">MuradKhanK31.com</a>
         </div>
      </footer>
    </div>
  );
}

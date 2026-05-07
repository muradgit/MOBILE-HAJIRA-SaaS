"use client";

import React from "react";
import { 
  Check, 
  Zap, 
  Star, 
  ShieldCheck, 
  Globe, 
  Smartphone, 
  Bell, 
  FileBox, 
  UserSquare, 
  Calendar,
  CloudOff,
  MapPin,
  Scan,
  LayoutGrid
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

const plans = [
  {
    name: "চিরদিন ফ্রি",
    subtitle: "Free Forever",
    price: "ফ্রি",
    period: "সব সময়ের জন্য",
    attendance: "১০০টি হাজিরা / মাস",
    features: ["সব ফিচার অন্তর্ভুক্ত"],
    buttonText: "ফ্রি শুরু করুন",
    highlight: false,
    color: "teal",
  },
  {
    name: "স্টার্টার প্যাক",
    subtitle: "Starter Pack",
    price: "৳১৯৯",
    period: "২ মাস মেয়াদ",
    attendance: "৩০০টি হাজিরা",
    features: ["সব ফিচার অন্তর্ভুক্ত"],
    buttonText: "স্টার্টার বেছে নিন",
    highlight: false,
    color: "blue",
  },
  {
    name: "স্ট্যান্ডার্ড প্যাক",
    subtitle: "Standard Pack",
    price: "৳৪৯৯",
    period: "৩ মাস মেয়াদ",
    attendance: "১০০০টি হাজিরা",
    features: ["সব ফিচার অন্তর্ভুক্ত"],
    buttonText: "স্ট্যান্ডার্ড বেছে নিন",
    highlight: true,
    badge: "সবচেয়ে জনপ্রিয়",
    color: "teal",
  },
  {
    name: "প্রিমিয়াম প্যাক",
    subtitle: "Premium Pack",
    price: "৳৯৯৯",
    period: "৬ মাস মেয়াদ",
    attendance: "৫০০০টি হাজিরা",
    features: ["সব ফিচার অন্তর্ভুক্ত"],
    buttonText: "প্রিমিয়াম বেছে নিন",
    highlight: false,
    color: "blue",
  },
  {
    name: "এন্টারপ্রাইজ প্যাক",
    subtitle: "Enterprise Pack",
    price: "৳২৯৯৯",
    period: "১২ মাস মেয়াদ",
    attendance: "২০০০০টি হাজিরা",
    features: ["সব ফিচার অন্তর্ভুক্ত"],
    buttonText: "এন্টারপ্রাইজ বেছে নিন",
    highlight: false,
    color: "teal",
  },
];

const addOns = [
  { name: "মিনি বুস্ট (Mini Boost)", price: "৳৯৯", desc: "অতিরিক্ত ২০০টি হাজিরা" },
  { name: "গ্রোথ বুস্ট (Growth Boost)", price: "৳২৯৯", desc: "অতিরিক্ত ১০০০টি হাজিরা" },
];

const allFeatures = [
  { name: "ম্যানুয়াল হাজিরা", icon: UserSquare },
  { name: "QR কোড হাজিরা", icon: Scan },
  { name: "কোড-ভিত্তিক হাজিরা", icon: Zap },
  { name: "ফেস ডিটেকশন (AI)", icon: ShieldCheck },
  { name: "লোকেশন ট্র্যাকিং", icon: MapPin },
  { name: "অফলাইন হাজিরা", icon: CloudOff },
  { name: "PWA মোবাইল অ্যাপ", icon: Smartphone },
  { name: "অভিভাবক নোটিফিকেশন", icon: Bell },
  { name: "অটোমেটিক রিপোর্ট", icon: FileBox },
  { name: "ID কার্ড জেনারেশন", icon: LayoutGrid },
  { name: "ইভেন্ট হাজিরা", icon: Calendar },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-4 sm:px-6 lg:px-8 font-bengali">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto text-center mb-20">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-teal-600 font-black uppercase tracking-widest text-xs mb-4"
        >
          Pricing Plans
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight"
        >
          Attendance-as-a-Utility Pricing
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-500 max-w-2xl mx-auto font-medium"
        >
          আপনার প্রয়োজন অনুযায়ী সহজ ও সাশ্রয়ী মূল্যের প্ল্যান বেছে নিন। কোন হিডেন চার্জ নেই।
        </motion.p>
      </div>

      {/* Main Pricing Cards Grid */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-32">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "relative flex flex-col p-8 bg-white rounded-[2rem] transition-all duration-300",
              plan.highlight 
                ? "ring-4 ring-teal-500/20 shadow-2xl shadow-teal-900/10 scale-105 z-10" 
                : "border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
            )}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-lg shadow-teal-500/30">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{plan.subtitle}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">/ {plan.period}</span>
              </div>
            </div>

            <div className="space-y-4 mb-10 flex-grow">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                  plan.color === 'teal' ? "bg-teal-50 border-teal-100 text-teal-600" : "bg-blue-50 border-blue-100 text-blue-600"
                )}>
                  <Zap className="w-4 h-4" />
                </div>
                <p className="text-sm font-black text-slate-700 leading-tight">
                  {plan.attendance}
                </p>
              </div>

              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 px-1">
                   <div className="w-5 h-5 bg-teal-50 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-teal-600" />
                   </div>
                   <p className="text-sm font-bold text-slate-500">{feature}</p>
                </div>
              ))}
            </div>

            <button className={cn(
              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
              plan.highlight 
                ? "bg-teal-600 text-white shadow-xl shadow-teal-500/30 hover:scale-[1.02] active:scale-[0.98]" 
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            )}>
              {plan.buttonText}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Extra Add-On Packs */}
      <div className="max-w-4xl mx-auto mb-32">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-black text-slate-900 mb-2">অতিরিক্ত অ্যাড-অন প্যাক (Extra Add-On Packs)</h2>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Need more? Boost your attendance limit anytime.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {addOns.map((add) => (
             <CardInner key={add.name}>
                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900">{add.name}</h4>
                      <p className="text-sm font-bold text-teal-600 italic tracking-tight">{add.desc}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{add.price}</p>
                   </div>
                </div>
             </CardInner>
           ))}
        </div>
      </div>

      {/* Shared Features Grid */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-slate-200/50 border border-slate-50">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 mb-4">সব প্ল্যানে যা যা থাকছে (Included Features)</h2>
              <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full" />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8">
              {allFeatures.map((f) => (
                <div key={f.name} className="flex gap-4 group">
                   <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                      <f.icon className="w-5 h-5" />
                   </div>
                   <div className="pt-2">
                      <h4 className="text-sm font-black text-slate-900 mb-1">{f.name}</h4>
                      <div className="flex items-center gap-1.5 opacity-60">
                         <Check className="w-3 h-3 text-emerald-500" />
                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Included</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-xl mx-auto text-center mt-32 space-y-8">
         <h3 className="text-2xl font-black text-slate-900">আপনার প্রতিষ্ঠানের জন্য কোনটি সেরা?</h3>
         <button className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
            আমাদের সাথে যোগাযোগ করুন
         </button>
      </div>
    </div>
  );
}

function CardInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

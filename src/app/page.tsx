"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  QrCode, 
  Users, 
  FileText, 
  LogIn, 
  UserPlus 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-16 py-12">
      <div className="space-y-6 max-w-3xl w-full px-4">
        <ShieldCheck className="w-20 h-20 text-[#6f42c1] mx-auto mb-8" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          খাতা-কলম আর নয়,<br/><span className="text-[#6f42c1]">হাজিরা এখন মোবাইলে!</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mt-6">
          মাত্র ২ মিনিটে ক্লাসের হাজিরা নিন, অটোমেটিক রিপোর্ট তৈরি করুন এবং হাজার হাজার শিক্ষার্থীর আইডি কার্ড জেনারেট করুন।
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 relative z-10">
          <Link 
            href="/auth/login"
            className="w-full sm:w-auto bg-[#6f42c1] text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          >
            <LogIn className="w-5 h-5" />
            লগইন করুন
          </Link>
          <Link 
            href="/auth/register"
            className="w-full sm:w-auto bg-white text-[#6f42c1] border-2 border-[#6f42c1] px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            রেজিস্ট্রেশন করুন
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">২ মিনিটে হাজিরা</h3>
          <p className="text-gray-600 leading-relaxed">QR স্ক্যানার অথবা চেকবক্স—যেকোনো পদ্ধতিতে দ্রুত হাজিরা নিন।</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">অটোমেটিক রিপোর্ট</h3>
          <p className="text-gray-600 leading-relaxed">মাস শেষে এক ক্লিকে PDF রিপোর্ট তৈরি করুন।</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">ফ্রি আইডি কার্ড জেনারেটর</h3>
          <p className="text-gray-600 leading-relaxed">হাজার হাজার শিক্ষার্থীর আইডি কার্ড তৈরি করুন ৩০ সেকেন্ডে।</p>
        </div>
      </div>
    </div>
  );
}

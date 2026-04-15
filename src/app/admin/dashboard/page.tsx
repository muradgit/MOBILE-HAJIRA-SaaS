"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  Wallet as WalletIcon, 
  FileText, 
  Users, 
  ChevronRight, 
  BookOpen, 
  Settings,
  Loader2
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";

export default function AdminDashboard() {
  const { userData, tenant, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingTeachers, setPendingTeachers] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);

  useEffect(() => {
    if (!userData || userData.role !== "InstitutionAdmin") return;

    const qT = query(collection(db, "users"), where("tenant_id", "==", userData.tenant_id), where("role", "==", "Teacher"), where("status", "==", "pending"));
    const qS = query(collection(db, "users"), where("tenant_id", "==", userData.tenant_id), where("role", "==", "Student"), where("status", "==", "pending"));
    
    const unsubT = onSnapshot(qT, (s) => setPendingTeachers(s.size));
    const unsubS = onSnapshot(qS, (s) => setPendingStudents(s.size));
    
    return () => { unsubT(); unsubS(); };
  }, [userData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  if (!userData || userData.role !== "InstitutionAdmin") {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <Card className="p-5 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">ক্রেডিট ব্যালেন্স</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#6f42c1]">{tenant?.credits_left || 0}</span>
            <span className="text-xs text-gray-400 font-medium">Credits</span>
          </div>
        </div>
        <button 
          onClick={() => router.push("/wallet")}
          className="bg-gradient-to-r from-[#6f42c1] to-[#59359a] hover:from-[#59359a] hover:to-[#4a2c82] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <WalletIcon className="w-4 h-4" />
          রিচার্জ করুন
        </button>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => router.push("/reports")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">অ্যাটেন্ডেন্স রিপোর্ট</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => router.push("/teachers")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">শিক্ষক ম্যানেজমেন্ট</span>
              {pendingTeachers > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingTeachers}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => router.push("/students")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">শিক্ষার্থী ম্যানেজমেন্ট</span>
              {pendingStudents > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingStudents}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => router.push("/subjects/add")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1]">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">কোর্স ম্যানেজমেন্ট</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => router.push("/settings/general")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
              <Settings className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">ইনস্টিটিউট সেটিংস</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

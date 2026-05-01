"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { 
  QrCode, 
  FileText, 
  User, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";

export default function StudentDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  if (!userData || userData.role !== "student") {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <Card className="p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl overflow-hidden">
          {userData.profile_image ? <img src={userData.profile_image} alt="Profile" className="w-full h-full object-cover" /> : userData.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold">{userData.name}</h2>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Student • {userData.student_id || "N/A"}</p>
          <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">Class: {userData.class || "N/A"}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => router.push("/student/id")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-sm text-gray-800">Attendance Giver (My ID)</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Show this to your teacher</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        <button 
          onClick={() => router.push("/student/profile")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Student Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button 
          onClick={() => router.push("/reports/self")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Attendance Report</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { 
  QrCode, 
  FileText, 
  User, 
  ClipboardList, 
  ChevronRight,
  Loader2
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";

export default function TeacherDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const { activeRole } = useUserStore();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  const isAuthorized = activeRole === "Teacher" || userData?.role === "SuperAdmin";
  if (!userData || !isAuthorized) {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-md mx-auto">
      <Card className="p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] font-bold text-xl overflow-hidden">
          {userData.profile_image ? <img src={userData.profile_image} alt="Profile" className="w-full h-full object-cover" /> : userData.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold">{userData.name}</h2>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Teacher • {userData.teacher_id || "N/A"}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => router.push("/scanner")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1]">
            <QrCode className="w-6 h-6" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Attendance Taker</span>
        </button>
        <button 
          onClick={() => router.push("/reports")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Class Report</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        <button 
          onClick={() => router.push("/teacher/profile")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Teachers Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button 
          onClick={() => router.push("/reports/attendance")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Attendance Report</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

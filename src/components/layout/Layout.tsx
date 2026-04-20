"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  QrCode, 
  Users, 
  Wallet as WalletIcon, 
  LogOut, 
  Plus, 
  FileText, 
  Home, 
  User, 
  ClipboardList, 
  Menu, 
  X, 
  ChevronDown, 
  LifeBuoy, 
  Database,
  History,
  Share2,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Settings
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { UserData, Tenant } from "@/src/lib/types";

const shareSystem = () => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({
      title: 'MOBILE-HAJIRA',
      text: 'হাজিরা নেয়ার সেরা সিস্টেম - MOBILE-HAJIRA',
      url: window.location.origin,
    }).catch(console.error);
  } else if (typeof navigator !== 'undefined') {
    navigator.clipboard.writeText(window.location.origin);
    toast.success("Link copied to clipboard!");
  }
};

const NavButton = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => {
  const pathname = usePathname();
  const isActive = pathname === to;
  return (
    <button 
      onClick={() => window.location.href = to}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-colors",
        isActive ? "text-[#6f42c1]" : "text-gray-400"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
};

export const Layout = ({ children, user, tenant }: { children: React.ReactNode, user: UserData | null, tenant: Tenant | null }) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuItems = {
    SuperAdmin: [
      { label: "Dashboard", to: "/super-admin/dashboard", icon: Home },
      { label: "Institutes", to: "/super-admin/institutes", icon: Database },
      { label: "Payments", to: "/super-admin/payments", icon: History },
      { label: "Users", to: "/super-admin/users", icon: Users },
      { label: "System Settings", to: "/super-admin/settings", icon: Settings },
    ],
    InstitutionAdmin: [
      { label: "Dashboard", to: "/admin/dashboard", icon: Home },
      { label: "User Management", to: "/admin/users", icon: Users },
      { label: "SMS Management", to: "/admin/sms", icon: MessageSquare },
      { label: "Billing & Credits", to: "/admin/billing", icon: WalletIcon },
      { label: "Institute Settings", to: "/admin/settings", icon: Settings },
      { label: "Reports", to: "/reports", icon: FileText },
    ],
    Teacher: [
      { label: "Profile", to: "/teacher/profile", icon: User },
      { label: "Attendance Taker", to: "/scanner", icon: QrCode },
      { label: "Class Report", to: "/reports", icon: FileText },
      { label: "Attendance History", to: "/reports/attendance", icon: ClipboardList },
    ],
    Student: [
      { label: "Attendance Giver", to: "/student/id", icon: QrCode },
      { label: "Profile", to: "/student/profile", icon: User },
      { label: "Attendance History", to: "/reports/history", icon: FileText },
    ],
  };

  const currentMenuItems = user ? menuItems[user.role] : [];

  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth);
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#141414]">
      <header className="sticky top-0 z-[100] bg-white border-b border-[#E4E3E0] px-4 py-3 flex items-center justify-between shadow-sm">
        {!user ? (
          <>
            <Link href="/" className="flex flex-col cursor-pointer">
              <h1 className="text-xl font-black text-[#6f42c1] leading-none">MOBILE-HAJIRA</h1>
              <p className="text-[10px] text-gray-500 font-bold mt-1">হাজিরা নেয়ার সেরা সিস্টেম</p>
            </Link>
            <div className="flex gap-2">
              <Link href="/auth/login" className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-gray-100">Login</Link>
              <Link href="/auth/register" className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-[#6f42c1] text-white rounded-lg hover:bg-[#59359a]">Register</Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                <span className="text-xs font-bold hidden sm:inline">মেন্যু</span>
              </button>
            </div>

                    <div className="flex flex-col items-center text-center flex-1 mx-4">
              <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">MOBILE-HAJIRA</h1>
              <h2 className="text-sm sm:text-lg font-black text-[#6f42c1] mt-1 line-clamp-1 font-bengali">
                {user.role === "SuperAdmin" ? "Super Admin Dashboard" : (tenant?.nameBN || tenant?.name || "Institution")}
              </h2>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                {auth.currentUser?.photoURL || user.profile_image ? (
                  <img src={auth.currentUser?.photoURL || user.profile_image} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      const profileRoutes = {
                        SuperAdmin: "/super-admin/dashboard",
                        InstitutionAdmin: "/admin/dashboard",
                        Teacher: "/teacher/profile",
                        Student: "/student/profile",
                      };
                      window.location.href = profileRoutes[user.role];
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" /> Your Profile
                  </button>

                  {/* Role Switching for Super Admin */}
                  {user.role === "SuperAdmin" && (
                    <>
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          toast.loading("Switching to Institute Admin...", { id: 'role-switch' });
                          await updateDoc(doc(db, "users", user.user_id), { role: "InstitutionAdmin" });
                          await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "InstitutionAdmin", userId: user.user_id }) });
                          toast.success("Switched to Institute Admin", { id: 'role-switch' });
                          window.location.href = "/admin/dashboard";
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <ShieldCheck className="w-4 h-4" /> Switch to Inst Admin
                      </button>
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          toast.loading("Switching to Teacher...", { id: 'role-switch' });
                          await updateDoc(doc(db, "users", user.user_id), { role: "Teacher" });
                          await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "Teacher", userId: user.user_id }) });
                          toast.success("Switched to Teacher", { id: 'role-switch' });
                          window.location.href = "/teacher/dashboard";
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <GraduationCap className="w-4 h-4" /> Switch to Teacher
                      </button>
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          toast.loading("Switching to Student...", { id: 'role-switch' });
                          await updateDoc(doc(db, "users", user.user_id), { role: "Student" });
                          await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "Student", userId: user.user_id }) });
                          toast.success("Switched to Student", { id: 'role-switch' });
                          window.location.href = "/student/dashboard";
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <Users className="w-4 h-4" /> Switch to Student
                      </button>
                    </>
                  )}

                  {/* Role Switching for Institution Admin */}
                  {user.role === "InstitutionAdmin" && (
                    <>
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          toast.loading("Switching to Teacher...", { id: 'role-switch' });
                          await updateDoc(doc(db, "users", user.user_id), { role: "Teacher" });
                          await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "Teacher", userId: user.user_id }) });
                          toast.success("Switched to Teacher", { id: 'role-switch' });
                          window.location.href = "/teacher/dashboard";
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <GraduationCap className="w-4 h-4" /> Switch to Teacher
                      </button>
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          toast.loading("Switching to Student...", { id: 'role-switch' });
                          await updateDoc(doc(db, "users", user.user_id), { role: "Student" });
                          await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "Student", userId: user.user_id }) });
                          toast.success("Switched to Student", { id: 'role-switch' });
                          window.location.href = "/student/dashboard";
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <Users className="w-4 h-4" /> Switch to Student
                      </button>
                    </>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-red-500"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {isMenuOpen && user && (
        <>
          <div 
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
          />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-[#6f42c1]">MENU</h2>
              <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {currentMenuItems.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.location.href = item.to;
                  }}
                  className="w-full px-6 py-3 text-left flex items-center gap-4 hover:bg-purple-50 transition-colors group"
                >
                  <item.icon className="w-5 h-5 text-gray-400 group-hover:text-[#6f42c1]" />
                  <span className="text-sm font-bold text-gray-700 group-hover:text-[#6f42c1] font-bengali">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <main className="max-w-7xl mx-auto p-4 pb-32">
        {children}
        
        {user && (
          <div className="mt-12 mb-8">
            {(user.role === "InstitutionAdmin" || user.role === "Teacher") ? (
              <div className="no-print bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 mx-auto max-w-md" style={{ paddingBottom: '80px' }}>
                <p className="font-bold text-gray-600 mb-4 font-bengali">Help Others and Get 20 Bonus Credits</p>
                <button 
                  onClick={shareSystem}
                  className="bg-purple-50 text-[#6f42c1] border border-purple-100 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:bg-purple-100 transition-all font-bengali"
                >
                  <Share2 className="w-4 h-4" /> সিস্টেমটি শেয়ার করুন
                </button>
                
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <small className="text-gray-400 block font-bengali">
                    MOBILE-HAJIRA Developed by
                  </small>
                  <a href="https://muradkhank31.com" target="_blank" rel="noopener noreferrer" className="text-[#6f42c1] font-black text-sm mt-1 inline-block hover:underline">
                    MuradKhanK31.com
                  </a>
                </div>
              </div>
            ) : user.role === "Student" ? (
              <div className="text-center py-8">
                <small className="text-gray-400 block">
                  MOBILE-HAJIRA Developed by
                </small>
                <a href="https://muradkhank31.com" target="_blank" rel="noopener noreferrer" className="text-[#6f42c1] font-black text-sm mt-1 inline-block hover:underline">
                  MuradKhanK31.com
                </a>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E3E0] px-4 py-2 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {user.role === "InstitutionAdmin" ? (
            <>
              <NavButton icon={Home} label="Dashboard" to="/admin/dashboard" />
              <NavButton icon={Users} label="Users" to="/admin/users" />
              <NavButton icon={MessageSquare} label="SMS" to="/admin/sms" />
              <NavButton icon={WalletIcon} label="Billing" to="/admin/billing" />
            </>
          ) : user.role === "Teacher" ? (
            <>
              <NavButton icon={Home} label="Dashboard" to="/teacher/dashboard" />
              <NavButton icon={QrCode} label="Scan" to="/scanner" />
              <NavButton icon={FileText} label="Report" to="/reports" />
            </>
          ) : user.role === "Student" ? (
            <>
              <NavButton icon={Home} label="Dashboard" to="/student/dashboard" />
              <NavButton icon={QrCode} label="My ID" to="/student/id" />
              <NavButton icon={FileText} label="Report" to="/reports/history" />
            </>
          ) : (
            <>
              <NavButton icon={Home} label="Dashboard" to="/super-admin/dashboard" />
              <NavButton icon={Database} label="Inst" to="/super-admin/institutes" />
              <NavButton icon={Users} label="Users" to="/super-admin/users" />
              <NavButton icon={History} label="Payments" to="/super-admin/payments" />
            </>
          )}
        </nav>
      )}
    </div>
  );
};

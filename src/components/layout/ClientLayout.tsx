"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { auth, db } from "@/src/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  ClipboardCheck, 
  Contact, 
  Menu, 
  X, 
  LogOut, 
  User, 
  ChevronRight,
  ExternalLink,
  Loader2,
  Bell,
  Home,
  MessageSquare,
  Search,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * ClientLayout - Global Navigation Shell (Overhauled for PWA feel)
 * Handles Authentication, Redirection, Role-Based Sidebar, Header, Mobile Bottom Nav & Branding.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { userData, tenant, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Sidebar & Navigation states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 1. Role-Based Menu Definitions
  const menuItems: Record<string, any[]> = {
    SuperAdmin: [
      { label: "ড্যাশবোর্ড", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "প্রতিষ্ঠান", href: "/super-admin/institutes", icon: Building2 },
      { label: "ইউজার", href: "/super-admin/users", icon: Users },
      { label: "পেমেন্ট ও ক্রেডিট", href: "/super-admin/payments", icon: CreditCard },
      { label: "সেটিংস", href: "/super-admin/settings", icon: Settings },
    ],
    InstitutionAdmin: [
      { label: "ড্যাশবোর্ড", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "ইউজার ম্যানেজমেন্ট", href: "/admin/users", icon: Users },
      { label: "সেটিংস", href: "/admin/settings", icon: Settings },
    ],
    Teacher: [
      { label: "ড্যাশবোর্ড", href: "/teacher/dashboard", icon: LayoutDashboard },
      { label: "হাজিরা প্যানেল", href: "/teacher/attendance", icon: ClipboardCheck },
    ],
    Student: [
      { label: "ড্যাশবোর্ড", href: "/student/dashboard", icon: LayoutDashboard },
      { label: "আইডি কার্ড", href: "/student/id-card", icon: Contact },
    ],
  };

  const currentMenu = (userData && menuItems[userData.role]) || [];

  // Mobile Bottom Nav Items
  const mobileNavItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Dashboard", href: userData ? (userData.role === "SuperAdmin" ? "/super-admin/dashboard" : (userData.role === "InstitutionAdmin" ? "/admin/dashboard" : (userData.role === "Teacher" ? "/teacher/dashboard" : "/student/dashboard"))) : "/auth/login", icon: LayoutDashboard },
    { label: "Inbox", href: "/notifications", icon: Bell }, // Mock notification route
    { label: "Profile", href: userData ? (userData.role === "Teacher" ? "/teacher/profile" : (userData.role === "Student" ? "/student/profile" : "/settings")) : "/auth/login", icon: User },
  ];

  // 2. Auth & Registration Logic (Preserved)
  useEffect(() => {
    const handlePendingRegistration = async () => {
      const pendingDataStr = localStorage.getItem('pendingRegistration');
      if (pendingDataStr && auth.currentUser) {
        const pendingData = JSON.parse(pendingDataStr);
        const user = auth.currentUser;

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            localStorage.removeItem('pendingRegistration');
            return;
          }

          let tenantId = pendingData.tenant_id;
          if (pendingData.role === "InstitutionAdmin") {
            tenantId = `tenant_${Date.now()}`;
            await setDoc(doc(db, "tenants", tenantId), {
              tenant_id: tenantId,
              name: pendingData.institutionNameEN,
              nameBN: pendingData.institutionNameBN,
              eiin: pendingData.eiin,
              credits_left: 100,
              status: "active",
              owner_email: user.email,
              created_at: new Date().toISOString(),
            });
          }

          const resolvedRole = (user.email === (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com")) 
            ? "SuperAdmin" 
            : (pendingData.role || "Student");

          const newUser: any = {
            user_id: user.uid,
            tenant_id: resolvedRole === "SuperAdmin" ? "SUPER_ADMIN" : tenantId,
            role: resolvedRole,
            name: pendingData.name || user.displayName || "User",
            nameBN: pendingData.nameBN || pendingData.name || "ইউজার",
            email: user.email,
            status: "approved",
            created_at: new Date().toISOString(),
          };

          await setDoc(doc(db, "users", user.uid), newUser);
          localStorage.removeItem('pendingRegistration');
          toast.success("নিবন্ধন সফল হয়েছে!");
          window.location.reload();
        } catch (error: any) {
          toast.error("ভুল হয়েছে: " + error.message);
        }
      }
    };

    if (!loading && auth.currentUser) {
      if (pathname === "/") {
        const dashboardMap: Record<string, string> = {
          SuperAdmin: "/super-admin/dashboard",
          InstitutionAdmin: "/admin/dashboard",
          Teacher: "/teacher/dashboard",
          Student: "/student/dashboard",
        };
        const target = userData?.role && dashboardMap[userData.role];
        if (target) router.push(target);
      }
      handlePendingRegistration();
    }
  }, [loading, userData, pathname, router]);

  const handleLogout = async () => {
    const toastId = toast.loading("লগআউট হচ্ছে...");
    try {
      await signOut(auth);
      toast.success("সফলভাবে লগআউট হয়েছে", { id: toastId });
      router.push("/auth/login");
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const isAuthPage = pathname.startsWith("/auth");

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-[#6f42c1] animate-spin mb-4" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 flex overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300"
        />
      )}

      {/* --- Sidebar --- */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-[100] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-[#6f42c1] leading-none tracking-tighter uppercase transition-all hover:scale-105 cursor-default">MOBILE-HAJIRA</h1>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest whitespace-nowrap">Digital Educational OS</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto no-scrollbar">
          {currentMenu.length > 0 ? (
            currentMenu.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group",
                    isActive 
                      ? "bg-purple-600 text-white shadow-xl shadow-purple-500/30" 
                      : "text-gray-500 hover:bg-purple-50 hover:text-[#6f42c1]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                      isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-purple-100 group-hover:text-[#6f42c1]"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black font-bengali tracking-tight">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No Menu Available</p>
            </div>
          )}
        </nav>

        {/* --- Sidebar Footer Branding --- */}
        <div className="p-6 border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#6f42c1] p-0.5 bg-white overflow-hidden shadow-sm">
                <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                   <User className="w-5 h-5 text-[#6f42c1]" />
                </div>
            </div>
            <div className="flex flex-col">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Developed By</p>
                <a 
                  href="https://muradkhank31.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-black text-[#6f42c1] hover:underline"
                >
                  MuradKhanK31.com
                </a>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Page Container --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:text-[#6f42c1] transition-all hover:scale-110 active:scale-95"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] leading-none mb-1 hidden sm:block">
                {userData?.role === "SuperAdmin" ? "Master Command" : (tenant?.name || "Institution Portal")}
              </span>
              <h2 className="text-sm sm:text-base font-black text-gray-900 font-bengali truncate max-w-[150px] sm:max-w-[300px]">
                {userData?.nameBN || userData?.name || (isAuthPage ? "Authentication" : "Welcome")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex p-2.5 bg-gray-50 rounded-full text-gray-400 hover:text-[#6f42c1] hover:bg-purple-50 transition-all cursor-pointer relative group">
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#6f42c1] rounded-full border-2 border-white" />
            </button>

            {userData && (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 sm:p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-all border border-transparent hover:border-purple-200"
                >
                  {auth.currentUser?.photoURL ? (
                    <img src={auth.currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full object-cover shadow-sm bg-white" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#6f42c1] flex items-center justify-center text-white text-xs font-black shadow-lg shadow-purple-500/20">
                      {userData.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:block text-xs font-black text-gray-700 pr-2">{userData.role}</span>
                </button>

                {isProfileOpen && (
                  <>
                    <div onClick={() => setIsProfileOpen(false)} className="fixed inset-0 z-[110]" />
                    <div className="absolute right-0 mt-4 w-72 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl py-5 px-4 z-[120] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="px-4 pb-4 border-b border-gray-50 mb-4 flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] mb-3">
                             <ShieldCheck className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-black text-gray-900 truncate w-full">{userData.email}</p>
                          <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mt-1">{userData.role}</p>
                      </div>
                      
                      <button 
                         onClick={() => {
                          setIsProfileOpen(false);
                          router.push("/settings");
                         }}
                         className="w-full px-6 py-4 text-left text-sm font-black text-gray-700 hover:bg-purple-50 hover:text-[#6f42c1] rounded-2xl flex items-center gap-4 transition-all"
                      >
                        <User className="w-4 h-4 opacity-50" /> প্রোফাইল সেটিংস
                      </button>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full px-6 py-4 text-left text-sm font-black text-red-500 hover:bg-red-50 rounded-2xl flex items-center gap-4 transition-all mt-1"
                      >
                        <LogOut className="w-4 h-4 opacity-50" /> লগআউট করুন
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* --- Main Sub-Scrolling Area --- */}
        <main className="flex-1 overflow-y-auto bg-gray-50 no-scrollbar relative z-30 pb-32 lg:pb-8">
           <div className="w-full max-w-7xl mx-auto">
              {children}
           </div>

           {/* Dashboard Graceful Fallback Helper (Hidden for students) */}
           {userData?.role === "SuperAdmin" && (
             <div className="fixed bottom-24 right-8 z-[100] group">
                <div className="absolute bottom-full right-0 mb-4 scale-0 group-hover:scale-100 transition-all origin-bottom-right">
                    <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-2xl w-64">
                         <h4 className="text-xs font-black text-gray-900 mb-2 font-bengali">অ্যাডমিন হেল্পার</h4>
                         <p className="text-[10px] text-gray-500 font-medium leading-relaxed">ডাটা লোড না হলে অথবা "Permission Denied" দেখালে ফায়ারবেজ ইনডেক্স এবং সিকিউরিটি রুলস চেক করুন।</p>
                    </div>
                </div>
                <button className="w-12 h-12 bg-white border border-gray-100 rounded-full shadow-2xl flex items-center justify-center text-purple-600 hover:scale-110 active:scale-95 transition-all">
                   <AlertCircle className="w-6 h-6" />
                </button>
             </div>
           )}
        </main>

        {/* --- Mobile Bottom Navigation --- */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-3 flex items-center justify-between lg:hidden z-[80] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all flex-1",
                  isActive ? "text-[#6f42c1]" : "text-gray-400"
                )}
              >
                <div className={cn(
                  "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
                  isActive ? "bg-purple-100" : ""
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
                </div>
                <span className={cn(isActive ? "text-[10px] font-black" : "text-[9px] font-bold", "uppercase tracking-widest mt-1")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );
}

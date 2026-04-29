"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
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
  ShieldCheck,
  LogIn,
  UserPlus
} from "lucide-react";
import { cn } from "@/src/lib/utils";

import { useUserStore } from "@/src/store/useUserStore";

/**
 * Professional Overlay UI for MOBILE-HAJIRA-SaaS
 * Features: Dynamic Header, Role-Based Mobile Nav, Professional Sidebar.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { userData, tenant, loading } = useAuth();
  const { activeRole, setActiveRole, user: storeUser } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Close menus when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  // Click outside to close profile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest(".profile-menu-container")) {
          setIsProfileOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  // Skip sidebar for landing page and auth pages
  const isLandingPage = pathname === "/";
  const isAuthPage = pathname.startsWith("/auth");
  const isDashboardPage = !isLandingPage && !isAuthPage;

  // Check if onboarding is needed
  const normalizedRole = (userData?.role || "").toLowerCase().replace(/\s+/g, "");
  const isDashboardArea = pathname.startsWith("/admin") || pathname.startsWith("/super-admin");
  const isOnboarding = (normalizedRole === "institutionadmin" || normalizedRole === "superadmin") && isDashboardArea && !tenant?.googleSheetId && !!userData?.tenant_id;

    // 3. Layout visibility logic
    const hideLayout = isOnboarding;
  
    // 1. Role-Based Menu Definitions
  const menuItems: Record<string, any[]> = {
    SuperAdmin: [
      { label: "ড্যাশবোর্ড", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "প্রতিষ্ঠান", href: "/super-admin/institutes", icon: Building2 },
      { label: "ইউজার", href: "/super-admin/users", icon: Users },
      { label: "পেমেন্ট ও ক্রেডিট", href: "/super-admin/payments", icon: CreditCard },
      { label: "প্রোফাইল", href: "/profile", icon: User },
      { label: "সেটিংস", href: "/super-admin/settings", icon: Settings },
    ],
    InstitutionAdmin: [
      { label: "ড্যাশবোর্ড", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "শিক্ষক", href: "/admin/teachers", icon: Users },
      { label: "শিক্ষার্থী", href: "/admin/students", icon: UserPlus },
      { label: "প্রোফাইল", href: "/profile", icon: User },
      { label: "সেটিংস", href: "/admin/settings", icon: Settings },
    ],
    Teacher: [
      { label: "ড্যাশবোর্ড", href: "/teacher/dashboard", icon: LayoutDashboard },
      { label: "হাজিরা প্যানেল", href: "/teacher/attendance", icon: ClipboardCheck },
      { label: "প্রোফাইল", href: "/profile", icon: User },
    ],
    Student: [
      { label: "ড্যাশবোর্ড", href: "/student/dashboard", icon: LayoutDashboard },
      { label: "আইডি কার্ড", href: "/student/id-card", icon: Contact },
      { label: "প্রোফাইল", href: "/profile", icon: User },
    ],
  };

  // Helper for robust role-based navigation mapping
  const getNormalizedMenuKey = (role: string | undefined | null): string => {
    if (!role) return "";
    const normalized = role.toLowerCase().replace(/\s+/g, "");
    if (["institutionadmin", "instituteadmin", "admin"].includes(normalized)) {
      return "InstitutionAdmin";
    }
    if (normalized === "superadmin") return "SuperAdmin";
    if (normalized === "teacher") return "Teacher";
    if (normalized === "student") return "Student";
    return role; // Fallback
  };

  const effectiveRole = activeRole || userData?.role;
  const menuKey = getNormalizedMenuKey(effectiveRole);
  const currentMenu = (userData && menuItems[menuKey]) || [];

  // 2. Mobile Bottom Navigation Config
  const mobileNavMapping: Record<string, any[]> = {
    SuperAdmin: [
      { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { label: "Institutes", href: "/super-admin/institutes", icon: Building2 },
      { label: "Users", href: "/super-admin/users", icon: Users },
      { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
    ],
    InstitutionAdmin: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Teachers", href: "/admin/teachers", icon: Users },
      { label: "Students", href: "/admin/students", icon: UserPlus },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
    Teacher: [
      { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
      { label: "Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
    ],
    Student: [
      { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
      { label: "ID Card", href: "/student/id-card", icon: Contact },
    ],
  };

  const mobileNavItems = (userData && mobileNavMapping[menuKey]) || [];
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";

  // Helper for robust role-based redirection
  const getDashboardRoute = (role: string | undefined | null): string => {
    const roleToUse = role || userData?.role;
    if (!roleToUse) return "/";
    const normalizedRole = roleToUse.toLowerCase().replace(/\s+/g, "");
    
    // Check for SuperAdmin via explicitly assigned role first
    if (normalizedRole === "superadmin") {
      return "/super-admin/dashboard";
    }

    // Explicitly mapping all Admin variations to /admin/dashboard
    if (["institutionadmin", "instituteadmin", "admin"].includes(normalizedRole)) {
      return "/admin/dashboard";
    }

    // Role-based fallback for SuperAdmin email if NO role is assigned yet or it's unknown
    if (auth.currentUser?.email === superAdminEmail) {
      return "/super-admin/dashboard";
    }
    
    if (normalizedRole === "teacher") {
      return "/teacher/dashboard";
    }
    
    if (normalizedRole === "student") {
      return "/student/dashboard";
    }
    
    return "/";
  };

  // Maintenance: Handle redirect from root or auth pages to dashboard if logged in
  useEffect(() => {
    if (!loading && auth.currentUser && (isLandingPage || isAuthPage)) {
      // Check if user is blocked or pending
      const status = userData?.status?.toLowerCase() || "";
      const isAllowed = ["active", "approved"].includes(status);
      
      if (isAllowed) {
        const target = getDashboardRoute(activeRole);
        if (target !== "/" && target !== pathname) {
          router.replace(target);
        }
      }
    }
  }, [loading, userData, isLandingPage, isAuthPage, router, pathname, activeRole]);

  // Logout Handler
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth/login");
  };

  const isDualRole = (userData?.role === "InstitutionAdmin" || (userData?.role as string) === "Admin") && userData?.is_also_teacher;

  const handleRoleSwitch = () => {
    const nextRole = activeRole === "Teacher" ? (userData?.role || "InstitutionAdmin") : "Teacher";
    setActiveRole(nextRole);
    router.push(getDashboardRoute(nextRole));
    setIsProfileOpen(false);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin mb-4" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing Data...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#F8F9FA]">
      
      {/* 1. TOP HEADER (Professional Overlay) */}
      {!hideLayout && (
        <header className="sticky top-0 h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 sm:px-10 z-[100] shrink-0">
          {!userData ? (
            /* LOGGED OUT HEADER */
            <>
              <div 
                onClick={() => router.push("/")}
                className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
              >
                 <h1 className="text-xl sm:text-2xl font-black text-[#6f42c1] leading-none tracking-tighter">Mobile Hajira</h1>
                 <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-1 font-bengali">হাজিরা নেয়ার সেরা সিস্টেম</p>
              </div>
              <div className="flex gap-2 sm:gap-4">
                 <button 
                   onClick={() => router.push("/auth/login")}
                   className="bg-[#6f42c1] text-white text-xs font-black uppercase px-6 py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                 >
                   <LogIn className="w-4 h-4" /> Login
                 </button>
              </div>
            </>
          ) : (
            /* LOGGED IN HEADER */
            <>
              <div className="flex items-center gap-4 sm:gap-6">
                 <button 
                   onClick={() => setIsSidebarOpen(true)}
                   className="flex items-center gap-2 text-gray-600 hover:text-[#6f42c1] transition-all group shrink-0"
                 >
                   <div className="p-2.5 bg-gray-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                     <Menu className="w-5 h-5 sm:w-6 h-6" />
                   </div>
                 </button>

                 <div 
                    onClick={() => router.push(getDashboardRoute(activeRole))}
                    className="flex flex-col cursor-pointer group"
                 >
                    <h1 className="text-sm sm:text-base font-black text-[#6f42c1] leading-tight tracking-tight group-hover:text-purple-700 transition-colors">
                      Mobile Hajira System
                    </h1>
                    <div className="flex flex-col -mt-0.5">
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 truncate max-w-[120px] sm:max-w-[200px]">
                        {userData.role === "SuperAdmin" ? "System Administration" : (tenant?.name || "Institution Panel")}
                      </p>
                      {userData.department && (
                        <p className="text-[8px] sm:text-[9px] font-medium text-gray-400 truncate max-w-[120px] sm:max-w-[180px]">
                          {userData.department}
                        </p>
                      )}
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                    নমস্কার
                  </span>
                  <h2 className="text-sm font-black text-gray-900 truncate">
                    {userData.nameBN || userData.name}
                  </h2>
                </div>
                
                <div className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:text-[#6f42c1] cursor-pointer relative hidden sm:block">
                   <Bell className="w-5 h-5" />
                   <div className="absolute top-2 right-2 w-2 h-2 bg-[#6f42c1] rounded-full" />
                </div>
                <div className="relative profile-menu-container">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#6f42c1] text-white flex items-center justify-center text-xs font-black shadow-lg shadow-purple-500/20 overflow-hidden">
                      {auth.currentUser?.photoURL ? (
                        <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : userData.name.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-4 w-60 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in-95">
                      <div className="px-4 py-3 border-b border-gray-50 mb-2">
                         <p className="text-xs font-black text-gray-900 truncate">{userData.email}</p>
                         <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1">{userData.role}</p>
                      </div>
                      <button 
                        onClick={() => {
                          router.push("/profile");
                          setIsProfileOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <User className="w-4 h-4" /> Profile
                      </button>
                      {isDualRole && (
                        <button 
                          onClick={handleRoleSwitch}
                          className="w-full px-4 py-2.5 text-left text-sm font-bold text-purple-600 hover:bg-purple-50 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4" /> 
                            {activeRole === "Teacher" ? "Admin View" : "Teacher View"}
                          </div>
                          <div className="px-1.5 py-0.5 rounded-md bg-purple-100 text-[8px] font-black uppercase">Switch</div>
                        </button>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </header>
      )}

      {/* --- SIDEBAR (Slide-over with close) --- */}
      {!hideLayout && isSidebarOpen && userData && (
        <div className="fixed inset-0 z-[100]">
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Sidebar Branding & Close */}
            <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-50">
               <div className="flex flex-col">
                  <h3 className="text-lg font-black text-[#6f42c1] leading-none mb-1">MOBILE-HAJIRA</h3>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dashboard Menu</span>
               </div>
               <button 
                 onClick={() => setIsSidebarOpen(false)}
                 className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500"
               >
                 <X className="w-6 h-6" />
               </button>
            </div>

            {/* Menu List */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
              {currentMenu.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group",
                    pathname === item.href 
                      ? "bg-purple-50 text-[#6f42c1]" 
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                      pathname === item.href ? "bg-[#6f42c1] text-white" : "bg-gray-100 text-gray-400 group-hover:text-[#6f42c1]"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black font-bengali tracking-tight">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </nav>

            {/* Sidebar Branding Footer */}
            <div className="p-6 border-t border-gray-50 bg-gray-50/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#6f42c1] p-0.5 bg-white">
                      <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                         <User className="w-6 h-6 text-[#6f42c1]" />
                      </div>
                  </div>
                  <div className="flex flex-col">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Developer</p>
                     <a href="https://muradkhank31.com" target="_blank" className="text-xs font-black text-[#6f42c1] hover:underline">
                       MuradKhanK31.com
                     </a>
                  </div>
               </div>
            </div>
          </aside>
        </div>
      )}

      {/* --- MAIN CONTENT (Self-Scrolling Area) --- */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar">
         <div className="main-content w-full min-h-full bg-[#f8f9fa] pb-24 lg:pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-10 py-8">
               {children}
            </div>

            {/* Global Page Footer Branding */}
            <footer className="mt-20 py-12 border-t border-gray-100 text-center space-y-4">
               <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-[#6f42c1] p-0.5 bg-white mx-auto">
                      <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                         <User className="w-6 h-6 text-[#6f42c1]" />
                      </div>
                  </div>
                  <p className="text-xs font-black text-gray-500 font-bengali">Developed By: <a href="https://muradkhank31.com" target="_blank" className="text-[#6f42c1] hover:underline">MuradKhanK31.com</a></p>
               </div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">© 2026 MOBILE-HAJIRA - All Rights Reserved</p>
            </footer>
         </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      {!hideLayout && userData && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 px-6 flex items-center justify-between lg:hidden z-50">
           {mobileNavItems.map((item) => {
             const isActive = pathname === item.href;
             return (
               <button
                 key={item.href}
                 onClick={() => router.push(item.href)}
                 className={cn(
                   "flex flex-col items-center gap-1 transition-all",
                   isActive ? "text-[#6f42c1]" : "text-gray-400"
                 )}
               >
                 <div className={cn(
                   "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
                   isActive ? "bg-purple-100" : ""
                 )}>
                   <item.icon className="w-5 h-5" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
               </button>
             );
           })}
        </nav>
      )}
    </div>
  );
}

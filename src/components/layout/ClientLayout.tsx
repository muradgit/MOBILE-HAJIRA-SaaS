"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { auth, db } from "@/src/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
  Bell
} from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * ClientLayout - Global Navigation Shell
 * Handles Authentication, Redirection, Role-Based Sidebar, Header & Branding.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { userData, tenant, loading } = useAuth();
  const { userRole } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();

  // Sidebar & Layout states
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

  // 2. Auth & Registration Logic (Preserved from original)
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
              credits_left: 100, // Updated bonus credits as per new guidelines
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
      // Auto-redirect from home to dashboard
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

  // Logout Handler
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

  // Skip layout for login/register pages
  const isAuthPage = pathname.startsWith("/auth");
  if (isAuthPage) return <>{children}</>;

  // Loading Screen
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
        />
      )}

      {/* --- Sidebar (Dynamic Menu) --- */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-[#6f42c1] leading-none tracking-tighter uppercase">MOBILE-HAJIRA</h1>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest whitespace-nowrap">Attendance Re-imagined</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {currentMenu.map((item) => {
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
                    ? "bg-purple-50 text-[#6f42c1] shadow-sm shadow-purple-500/10" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                    isActive ? "bg-[#6f42c1] text-white" : "bg-gray-100 text-gray-400 group-hover:bg-purple-100 group-hover:text-[#6f42c1]"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold font-bengali tracking-tight">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* --- Mandatory Branding (Sidebar Footer) --- */}
        <div className="p-6 border-t border-gray-50 bg-gray-50/50">
          <div className="flex flex-col items-center text-center gap-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Powered By</p>
            <a 
              href="https://muradkhank31.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex flex-col items-center"
            >
              <span className="text-xs font-black text-[#6f42c1] hover:underline flex items-center gap-1">
                MuradKhanK31.com
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5">Developed By AI Principal</p>
            </a>
          </div>
        </div>
      </aside>

      {/* --- Main Content Layout --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header (Top Bar) */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-gray-50 rounded-xl text-gray-500 hover:text-[#6f42c1] transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                {userData?.role === "SuperAdmin" ? "System Control" : (tenant?.name || "Institution Panel")}
              </span>
              <h2 className="text-sm font-black text-gray-900 font-bengali uppercase tracking-tight truncate max-w-[200px]">
                {userData?.nameBN || userData?.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:text-[#6f42c1] transition-all cursor-pointer relative">
              <Bell className="w-5 h-5" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#6f42c1] rounded-full border-2 border-white" />
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-all border border-transparent hover:border-purple-200"
              >
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#6f42c1] flex items-center justify-center text-white text-xs font-black">
                    {userData?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-xs font-black text-gray-700 pr-2">{userData?.role}</span>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <>
                  <div onClick={() => setIsProfileOpen(false)} className="fixed inset-0 z-[60]" />
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-3xl shadow-2xl py-3 z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-gray-50 mb-2">
                        <p className="text-sm font-black text-gray-900 truncate">{userData?.email}</p>
                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1">{userData?.role}</p>
                    </div>
                    
                    <button 
                       onClick={() => {
                        setIsProfileOpen(false);
                        const routes = {
                          SuperAdmin: "/super-admin/settings",
                          InstitutionAdmin: "/admin/settings",
                          Teacher: "/teacher/dashboard",
                          Student: "/student/dashboard",
                        };
                        router.push(routes[userData?.role as keyof typeof routes] || "/");
                       }}
                       className="w-full px-6 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <User className="w-4 h-4" /> প্রোফাইল সেটিংস
                    </button>
                    
                    <hr className="my-2 border-gray-50" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full px-6 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> লগআউট করুন
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 overscroll-none">
          {children}
          
          {/* Dashboard Padding for Mobile Bottom Bar If Needed - Currently Side-Menu covers it */}
          <div className="h-20 lg:hidden" />
        </main>
      </div>
    </div>
  );
}

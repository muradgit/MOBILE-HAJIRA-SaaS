"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/src/lib/firebase";
import { useUserStore } from "@/src/store/useUserStore";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { ShieldCheck, AlertCircle, Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { UserData, UserRole, Tenant } from "@/src/lib/types";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      let finalEmail = email;

      // Hybrid Login Logic: If identifier doesn't contain '@', it's a username
      if (!email.includes("@")) {
        const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
        const q = query(collection(db, "users"), where("username", "==", email), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error("এই ইউজার আইডিটি খুঁজে পাওয়া যায়নি।");
        }
        
        const userData = querySnapshot.docs[0].data() as UserData;
        finalEmail = userData.email || `${email}_${userData.tenant_id}@internal.com`.toLowerCase();
      }

      const result = await signInWithEmailAndPassword(auth, finalEmail, password);
      
      // Email Verification Check
      if (result.user.email && !result.user.emailVerified && !result.user.email.endsWith("@internal.com")) {
        await signOut(auth);
        throw new Error("আপনার ইমেইল ভেরিফাই করুন। আমরা আপনার ইমেইলে একটি ভেরিফিকেশন লিংক পাঠিয়েছি।");
      }

      await processLogin(result.user.uid, result.user.email);
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        toast.error("লগইন ব্যর্থ হয়েছে। আপনার ইমেইল বা পাসওয়ার্ড সঠিক আছে কিনা যাচাই করুন। আপনি যদি গুগল দিয়ে অ্যাকাউন্ট খুলে থাকেন, তবে গুগলের মাধ্যমে লগইন করার চেষ্টা করুন।");
      } else {
        toast.error("Login failed: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("অনুগ্রহ করে আপনার ইমেইল এড্রেসটি দিন।");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।");
      setForgotMode(false);
    } catch (error: any) {
      console.error("Password reset failed:", error);
      toast.error(error.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await processLogin(result.user.uid, result.user.email);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const processLogin = async (uid: string, userEmail: string | null) => {
    const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
    const currentEmail = (userEmail || "").toLowerCase();
    
    // 1. Fetch user data from Firestore
    let userDoc;
    try {
      userDoc = await getDoc(doc(db, "users", uid));
    } catch (err: any) {
      console.error("Firestore read error during login:", err);
      if (err.message?.includes("permissions")) {
        throw new Error("আপনার ইউজার ডাটা পড়ার অনুমতি নেই। দয়া করে এডমিনের সাথে যোগাযোগ করুন। (Firestore Rules Error)");
      }
      throw new Error(`আপনার ইউজার ডাটা পড়তে সমস্যা হচ্ছে: ${err.message || "Unknown Error"}`);
    }
    
    let userData: UserData;
    const SUPER_ADMIN_EMAILS = ["hello@muradkhank31.com", "muradkhan31@gmail.com"];
    const normalizedCurrentEmail = currentEmail;

    if (!userDoc.exists()) {
      // If user doesn't exist, check if they should be super_admin based on email
      if (SUPER_ADMIN_EMAILS.includes(normalizedCurrentEmail)) {
        userData = {
          user_id: uid,
          tenant_id: "SUPER_ADMIN",
          role: "super_admin",
          name: auth.currentUser?.displayName || "Super Admin",
          nameBN: "সুপার এডমিন",
          email: normalizedCurrentEmail,
          status: "approved",
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, "users", uid), {
          ...userData,
          created_at: serverTimestamp()
        });
      } else {
        // Not a super admin and doesn't exist? They must register first.
        await signOut(auth);
        setErrorMsg(
          <div className="space-y-4">
            <p className="text-red-600 font-bold">আপনার এই অ্যাকাউন্টটি আমাদের ডাটাবেজে পাওয়া যায়নি।</p>
            <p className="text-sm text-gray-600">অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন করুন।</p>
            <Link 
              href="/auth/register"
              className="block w-full bg-[#6f42c1] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] text-center"
            >
              রেজিস্ট্রেশন করুন
            </Link>
          </div>
        );
        return;
      }
    } else {
      userData = userDoc.data() as UserData;
      
      // ROLE NORMALIZATION & AUTO-MIGRATION
      let rawRole = (userData.role || "").toLowerCase().replace(/[\s-]/g, "_");
      let normalizedRole = rawRole;

      if (rawRole === "admin" || rawRole === "institutionadmin" || rawRole === "institute_admin" || rawRole === "instituteadmin") {
        normalizedRole = "institute_admin";
      } else if (rawRole === "super_admin" || rawRole === "superadmin") {
        normalizedRole = "super_admin";
      }

      // STRICT Super Admin Security Verification
      if (normalizedRole === "super_admin") {
        if (!normalizedCurrentEmail || !SUPER_ADMIN_EMAILS.includes(normalizedCurrentEmail)) {
          await signOut(auth);
          toast.error("আপনার সুপার এডমিন প্যানেলে প্রবেশের অনুমতি নেই। (Unauthorized Email)");
          return;
        }
      }

      // Auto-Migration: If userData.role !== normalizedRole, update FirestoreDoc
      if (userData.role !== normalizedRole) {
        userData.role = normalizedRole as UserRole;
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", uid), { role: normalizedRole });
      }
    }

    // 2. Resolve Role
    const finalRole = userData.role;

    // 3. Set session cookies via API
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role: finalRole, 
          userId: uid,
          email: currentEmail // Send email to set user-email cookie
        }),
      });
    } catch (err) {
      console.error("Session Error:", err);
    }

    // 4. Approval Check (Teachers & Students)
    const lowerRole = (finalRole || "").toLowerCase();
    
    // Explicitly allow admins and superadmins
    const isPrivileged = ["super_admin", "institute_admin"].includes(lowerRole);
    
    if (!isPrivileged) {
      const isAllowed = ["active", "approved"].includes(userData.status || "");
      if (!isAllowed) {
        console.warn(`User ${uid} blocked: Status is ${userData.status}`);
        let tenantData: Tenant | null = null;
        try {
          const tenantDoc = await getDoc(doc(db, "tenants", userData.tenant_id));
          tenantData = tenantDoc.exists() ? tenantDoc.data() as Tenant : null;
        } catch (e) {
          console.error("Failed to fetch tenant info for blocked user", e);
        }
        
        await signOut(auth);
        setErrorMsg(
          <div className="space-y-4 font-bengali">
            <p className="text-red-600 font-bold">আপনার অ্যাকাউন্টটি বর্তমানে {userData.status === "suspended" ? "সাময়িকভাবে স্থগিত" : "অ্যাপ্রুভালের অপেক্ষায়"} আছে।</p>
            {tenantData && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left">
                <p className="text-[10px] uppercase font-black text-gray-400 mb-1">যোগাযোগ করুন:</p>
                <p className="font-bold text-gray-800">{tenantData.admin_name || tenantData.name}</p>
                <p className="text-xs text-gray-500">Institute Admin</p>
                {tenantData.admin_mobile && <p className="text-xs text-purple-600 mt-1">Mobile: {tenantData.admin_mobile}</p>}
              </div>
            )}
          </div>
        );
        return;
      }
    }

    /** 
     * 5. CRITICAL: Update STATE and REDIRECT IMMEDIATELY
     */
    
    // Sync store
    setUser({ ...userData, role: finalRole as any });

    // Force Next.js to invalidate layout cache
    router.refresh();

    // Handle redirection map
    const targetMap: Record<string, string> = {
      super_admin: "/super-admin/dashboard",
      institute_admin: "/admin/dashboard",
      teacher: "/teacher/dashboard",
      student: "/student/dashboard"
    };

    router.push(targetMap[lowerRole] || "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA] font-english">
      <div className="max-w-md w-full">
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-12 h-12 text-[#6f42c1]" />
            </div>
          </div>
          
          {errorMsg ? (
            <div className="space-y-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              {errorMsg}
              <button 
                onClick={() => setErrorMsg(null)}
                className="text-sm font-bold text-[#6f42c1] hover:underline"
              >
                আবার চেষ্টা করুন
              </button>
            </div>
          ) : forgotMode ? (
            <>
              <div className="space-y-2">
                <button 
                  onClick={() => setForgotMode(false)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-bold mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <h2 className="text-2xl font-bold text-gray-900">পাসওয়ার্ড রিসেট</h2>
                <p className="text-sm text-gray-500 font-bengali">আপনার ইমেইল দিন, আমরা একটি রিসেট লিংক পাঠাবো।</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institution.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "লিংক পাঠান"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">লগইন করুন</h2>
                <p className="text-sm text-gray-500 font-bengali">আপনার অ্যাকাউন্ট ব্যবহার করে লগইন করুন</p>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email or User ID</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institution.com or unique ID"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between mx-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                    <button 
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-[10px] font-bold text-[#6f42c1] hover:underline uppercase tracking-wider"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "লগইন করুন"}
                </button>
              </form>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Google
                </button>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-bengali">
                  অ্যাকাউন্ট নেই? <Link href="/auth/register" className="text-[#6f42c1] font-bold hover:underline">রেজিস্ট্রেশন করুন</Link>
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

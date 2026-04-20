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
  signInWithEmailAndPassword 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ShieldCheck, AlertCircle, Loader2, Mail, Lock } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { UserData, Tenant } from "@/src/lib/types";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await processLogin(result.user.uid);
    } catch (error: any) {
      toast.error("Login failed: " + error.message);
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
      await processLogin(result.user.uid);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const processLogin = async (uid: string) => {
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (!userDoc.exists()) {
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

    const userData = userDoc.data() as UserData;
    const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
    
    // Override role if it's the super admin email
    const finalRole = auth.currentUser?.email === superAdminEmail ? "SuperAdmin" : userData.role;

    // Update Global Store
    setUser({ ...userData, role: finalRole as any });

    // Set session cookie
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: finalRole, userId: userData.user_id }),
    });

    // Check for approval if Teacher or Student
    if ((finalRole === "Teacher" || finalRole === "Student") && userData.status !== "approved") {
      // Fetch tenant to get admin info
      const tenantDoc = await getDoc(doc(db, "tenants", userData.tenant_id));
      const tenantData = tenantDoc.exists() ? tenantDoc.data() as Tenant : null;
      
      await signOut(auth);
      setErrorMsg(
        <div className="space-y-4">
          <p className="text-red-600 font-bold">আপনার একাউন্টটি এখনো Institute Admin দ্বারা এপ্রুভ হয়নি।</p>
          {tenantData && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">যোগাযোগ করুন:</p>
              <p className="font-bold text-gray-800">{tenantData.admin_name}</p>
              <p className="text-sm text-gray-600">Institute Admin</p>
              {tenantData.admin_mobile && <p className="text-sm text-gray-600">মোবাইল: {tenantData.admin_mobile}</p>}
            </div>
          )}
        </div>
      );
      return;
    }

    // Role-Based Redirection Block
    if (finalRole === "SuperAdmin") {
      router.push("/super-admin/dashboard");
    } else if (finalRole === "InstitutionAdmin") {
      router.push("/admin/dashboard");
    } else if (finalRole === "Teacher") {
      router.push("/teacher/dashboard");
    } else if (finalRole === "Student") {
      router.push("/student/dashboard");
    } else {
      router.push("/");
    }
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
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">লগইন করুন</h2>
                <p className="text-sm text-gray-500 font-bengali">আপনার অ্যাকাউন্ট ব্যবহার করে লগইন করুন</p>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
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

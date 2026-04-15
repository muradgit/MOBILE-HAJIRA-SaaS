"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/src/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { UserData, Tenant } from "@/src/lib/types";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (!userDoc.exists()) {
        await signOut(auth);
        setErrorMsg(
          <div className="space-y-4">
            <p className="text-red-600 font-bold">আপনার এই জিমেইলটি আমাদের ডাটাবেজে পাওয়া যায়নি।</p>
            <p className="text-sm text-gray-600">অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন করুন।</p>
            <button 
              onClick={() => router.push("/auth/register")}
              className="w-full bg-[#6f42c1] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a]"
            >
              রেজিস্ট্রেশন করুন
            </button>
          </div>
        );
        return;
      }

      const userData = userDoc.data() as UserData;

      // Check for approval if Teacher or Student
      if ((userData.role === "Teacher" || userData.role === "Student") && userData.status !== "approved") {
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

      // Route based on role
      const roleRoutes = {
        SuperAdmin: "/super-admin/dashboard",
        InstitutionAdmin: "/admin/dashboard",
        Teacher: "/teacher/dashboard",
        Student: "/student/dashboard",
      };
      
      router.push(roleRoutes[userData.role] || "/");
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FA]">
      <div className="max-w-md w-full">
        <Card className="p-8 text-center space-y-8">
          <ShieldCheck className="w-16 h-16 text-[#6f42c1] mx-auto" />
          
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
                <h2 className="text-2xl font-bold">লগইন করুন</h2>
                <p className="text-sm text-gray-500">আপনার জিমেইল অ্যাকাউন্ট ব্যবহার করে লগইন করুন</p>
              </div>

              <div className="space-y-4 relative z-10">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  )}
                  Google দিয়ে লগইন
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
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

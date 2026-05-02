'use client';

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/src/lib/firebase";
import { confirmPasswordReset } from "firebase/auth";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/src/components/ui/Card";

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const router = useRouter();

  React.useEffect(() => {
    // Fallback URL parsing: Absolute source of truth
    const code = new URLSearchParams(window.location.search).get('oobCode');
    setOobCode(code);
    setIsInitializing(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!oobCode) {
      setErrorMsg("কোনো সিকিউরিটি কোড পাওয়া যায়নি। অনুগ্রহ করে আবার ইমেইল পাঠান।");
      return;
    }

    if (newPassword.length < 6) {
      return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("পাসওয়ার্ড দুটি মিলছে না।");
    }

    setLoading(true);
    setErrorMsg(null);
    setFirebaseError(null);
    try {
      // Lazy verification: calls confirmPasswordReset directly which also validates the oobCode
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      toast.success("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।");
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (error: any) {
      console.error("Password reset failed:", error);
      // Exact Firebase Error Exposure
      const exactError = `${error.code}: ${error.message}`;
      setFirebaseError(exactError);
      
      // Now we show the error if the link was invalid or already used
      setErrorMsg("লিঙ্কটি অবৈধ বা আগে ব্যবহার করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      toast.error("লিঙ্কটি অবৈধ বা আগে ব্যবহার করা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="flex flex-col items-center gap-4 text-[#6f42c1]">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-bold text-sm tracking-widest uppercase">যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="w-full max-w-md space-y-8 text-center text-red-500 font-bold bg-white p-12 rounded-3xl shadow-xl">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>কোনো সিকিউরিটি কোড পাওয়া যায়নি।</p>
          <button 
            onClick={() => router.push("/auth/login")}
            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo/Header */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-purple-500/10 flex items-center justify-center border border-gray-100">
            <ShieldCheck className="w-8 h-8 text-[#6f42c1]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">নতুন পাসওয়ার্ড</h1>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">SISHU SHIKKHA GHAR</p>
          </div>
        </div>

        <Card className="p-8 border-none shadow-2xl shadow-purple-500/5 bg-white/80 backdrop-blur-xl rounded-3xl">
          {errorMsg ? (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">ভুল হয়েছে!</h2>
                <p className="text-sm text-gray-500 font-bengali">{errorMsg}</p>
              </div>
              <button 
                onClick={() => {
                  setErrorMsg(null);
                  router.push("/auth/login");
                }}
                className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg"
              >
                লগইন পেজে ফিরে যান
              </button>
            </div>
          ) : success ? (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">সফল হয়েছে!</h2>
                <p className="text-sm text-gray-500">আপনার পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে। আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...</p>
              </div>
              <button 
                onClick={() => router.push("/auth/login")}
                className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg"
              >
                লগইন করুন
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-8">
                <p className="text-sm text-gray-500 font-bengali">
                  আপনার একাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন।
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "পাসওয়ার্ড আপডেট করুন"}
                </button>
              </form>

              <button 
                onClick={() => router.push("/auth/login")}
                className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-full font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> লগইন পেজে ফিরে যান
              </button>
            </>
          )}
        </Card>

        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} SISHU SHIKKHA GHAR • ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 text-[#6f42c1] animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

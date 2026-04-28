"use client";

import { useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { auth, db } from "@/src/lib/firebase";
import { 
  updatePassword, 
  updateProfile, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  linkWithCredential
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { 
  User, 
  Mail, 
  Shield, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Camera,
  Save,
  Users,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import Image from "next/image";
import { useUserStore } from "@/src/store/useUserStore";

export default function ProfilePage() {
  const { userData, user, loading } = useAuth();
  const { setActiveRole } = useUserStore();
  const [submitting, setSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Profile Info State
  const [name, setName] = useState(userData?.name || "");
  const [nameBN, setNameBN] = useState(userData?.nameBN || "");

  const canBeTeacher = userData?.role === "InstitutionAdmin" || (userData?.role as string) === "Admin";
  const isAlreadyTeacher = userData?.is_also_teacher;

  const handleAssignAsTeacher = async () => {
    if (!user || !userData) return;
    setPromoting(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/self-assign-teacher", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: userData.tenant_id,
        })
      });

      if (!res.ok) throw new Error("অ্যাসাইন করতে ব্যর্থ হয়েছে");

      toast.success("আপনি এখন একজন শিক্ষক হিসেবে তালিকাভুক্ত!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPromoting(false);
    }
  };

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isGoogleUser = user?.providerData.some(p => p.providerId === "google.com");
  const hasPassword = user?.providerData.some(p => p.providerId === "password");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    setSubmitting(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName: name });

      // 2. Update Firestore User Doc (Both top-level and subcollection)
      const userRef = doc(db, "users", user.uid);
      const updatePayload = {
        name,
        nameBN,
        updated_at: new Date().toISOString()
      };
      await updateDoc(userRef, updatePayload);

      // Also update subcollection if applicable
      if (userData.tenant_id && (userData.role === "Teacher" || userData.role === "Student")) {
        const subCollName = userData.role === "Teacher" ? "teachers" : "students";
        const subRef = doc(db, "tenants", userData.tenant_id, subCollName, user.uid);
        try {
          await updateDoc(subRef, updatePayload);
        } catch (e) {
          console.warn("Subcollection update skipped (might not exist):", e);
        }
      }

      toast.success("প্রোফাইল সফলভাবে আপডেট করা হয়েছে।");
    } catch (err: any) {
      console.error(err);
      toast.error("প্রোফাইল আপডেট করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      return toast.error("নতুন পাসওয়ার্ড দুটি মিলছে না।");
    }
    if (newPassword.length < 6) {
      return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
    }

    setPasswordSubmitting(true);
    try {
      // Use auth.currentUser directly to ensure the most up-to-date user object
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("ইউজার খুঁজে পাওয়া যায়নি।");

      // Refresh user object to get latest providerData
      await currentUser.reload();
      const freshUser = auth.currentUser;
      if (!freshUser) throw new Error("ইউজার লোড করতে সমস্যা হয়েছে।");

      const userHasPassword = freshUser.providerData.some(p => p.providerId === "password");

      // If user already has a password, re-authenticate first
      if (userHasPassword) {
        if (!currentPassword) {
          throw new Error("বর্তমান পাসওয়ার্ড আবশ্যক।");
        }
        const credential = EmailAuthProvider.credential(freshUser.email!, currentPassword);
        await reauthenticateWithCredential(freshUser, credential);
      }

      // Set/Update password
      if (userHasPassword) {
        await updatePassword(freshUser, newPassword);
      } else {
        const credential = EmailAuthProvider.credential(freshUser.email!, newPassword);
        await linkWithCredential(freshUser, credential);
      }

      // Update Firestore to mark that the user has a password set (Both top-level and subcollection)
      const userRef = doc(db, "users", freshUser.uid);
      const passPayload = {
        has_password: true,
        updated_at: new Date().toISOString()
      };
      await updateDoc(userRef, passPayload);

      // Also update subcollection if applicable
      if (userData?.tenant_id && (userData?.role === "Teacher" || userData?.role === "Student")) {
        const subCollName = userData.role === "Teacher" ? "teachers" : "students";
        const subRef = doc(db, "tenants", userData.tenant_id, subCollName, freshUser.uid);
        try {
          await updateDoc(subRef, passPayload);
        } catch (e) {
             console.warn("Subcollection password update skipped:", e);
        }
      }

      // Reload again to refresh the local state for the UI
      await freshUser.reload();

      toast.success(userHasPassword ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।" : "পাসওয়ার্ড সফলভাবে সেট করা হয়েছে।");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        toast.error("বর্তমান পাসওয়ার্ডটি সঠিক নয়।");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("নিরাপত্তার স্বার্থে পুনরায় লগইন করে চেষ্টা করুন।");
      } else {
        toast.error(err.message || "পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।");
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-bengali pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
          <User className="w-8 h-8 text-purple-600" /> আমার প্রোফাইল
        </h1>
        <p className="text-gray-500 font-medium mt-1">আপনার ব্যক্তিগত তথ্য এবং নিরাপত্তা সেটিংস ম্যানেজ করুন।</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-8 text-center relative overflow-hidden border-transparent shadow-xl shadow-purple-500/5 rounded-[2rem]">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-4xl font-black text-purple-600 overflow-hidden mx-auto border-4 border-white shadow-lg">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (userData?.name?.charAt(0) || "U")}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-purple-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4">
               <h2 className="text-xl font-black text-gray-900">{userData?.nameBN || userData?.name}</h2>
               <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1 bg-purple-50 inline-block px-3 py-1 rounded-full">
                 {userData?.role}
               </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 space-y-3">
               <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-gray-400 uppercase">ইমেইল</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{userData?.email}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">স্ট্যাটাস</p>
                    <p className="text-xs font-bold text-green-600">{userData?.status}</p>
                  </div>
               </div>

               {/* Dual Role Assignment (For Admins Only) */}
               {canBeTeacher && !isAlreadyTeacher && (
                 <div className="mt-4 pt-4 border-t border-gray-50">
                    <button 
                      onClick={handleAssignAsTeacher}
                      disabled={promoting}
                      className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-2xl group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl text-purple-600 shadow-sm">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-gray-900">নিজেকে শিক্ষক হিসেবে যুক্ত করুন</p>
                          <p className="text-[10px] text-gray-500 font-medium">Assign yourself to Teacher list</p>
                        </div>
                      </div>
                      {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-all" />}
                    </button>
                 </div>
               )}

               {isAlreadyTeacher && (
                 <div className="mt-4 pt-4 border-t border-gray-50">
                   <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl">
                     <div className="p-2 bg-white rounded-xl text-green-600 shadow-sm">
                       <ShieldCheck className="w-4 h-4" />
                     </div>
                     <div className="text-left">
                       <p className="text-xs font-black text-gray-900">আপনি একজন শিক্ষক হিসেবে যুক্ত আছেন</p>
                       <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Active Dual Role</p>
                     </div>
                   </div>
                 </div>
               )}
            </div>
          </Card>
        </div>

        {/* Right Column: Editing Forms */}
        <div className="md:col-span-2 space-y-8">
          
          {/* 1. General Profile Info */}
          <Card className="p-8 border-transparent shadow-xl shadow-purple-500/5 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">সাধারণ তথ্য</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Update your name and basic details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পুরো নাম (English)</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-600 transition-all font-sans"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">নাম (বাংলায়)</label>
                  <input 
                    type="text" 
                    value={nameBN} 
                    onChange={(e) => setNameBN(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                    placeholder="আপনার নাম বাংলায় লিখুন"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="bg-[#6f42c1] text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                প্রোফাইল সেভ করুন
              </button>
            </form>
          </Card>

          {/* 2. Password Change Section */}
          <Card className="p-8 border-transparent shadow-xl shadow-purple-500/5 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">নিরাপত্তা (পাসওয়ার্ড)</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Keep your account secure</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-4">
                {isGoogleUser && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Image 
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                        alt="Google" 
                        width={16} 
                        height={16} 
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">গুগল অ্যাকাউন্ট কানেক্টেড</p>
                      <p className="text-xs font-bold text-gray-700">
                        {hasPassword 
                          ? "আপনি জিমেইল বা পাসওয়ার্ড যেকোনোটি দিয়ে লগইন করতে পারেন।" 
                          : "ভবিষ্যতে জিমেইল ছাড়াই লগইন করতে নিচের পাসওয়ার্ডটি সেট করুন।"}
                      </p>
                    </div>
                  </div>
                )}

                {hasPassword && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> বর্তমান পাসওয়ার্ড
                    </label>
                    <input 
                      required
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {hasPassword ? "নতুন পাসওয়ার্ড" : "পাসওয়ার্ড সেট করুন"}
                    </label>
                    <input 
                      required
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                      placeholder="কমপক্ষে ৬ অক্ষর"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">নিশ্চিত করুন</label>
                    <input 
                      required
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-600 transition-all"
                      placeholder="আবার লিখুন"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={passwordSubmitting}
                className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {passwordSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                {hasPassword ? "পাসওয়ার্ড পরিবর্তন করুন" : "পাসওয়ার্ড সেট করুন"}
              </button>
            </form>
          </Card>

        </div>
      </div>
    </div>
  );
}

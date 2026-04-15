"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  ChevronRight 
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Tenant } from "@/src/lib/types";
import { cn } from "@/src/lib/utils";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"InstitutionAdmin" | "Teacher" | "Student">("InstitutionAdmin");
  const [agreed, setAgreed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, "tenants"),
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => doc.data() as Tenant);
      
      // Also search by EIIN
      const qEiin = query(collection(db, "tenants"), where("eiin", "==", searchQuery));
      const snapshotEiin = await getDocs(qEiin);
      const resultsEiin = snapshotEiin.docs.map(doc => doc.data() as Tenant);
      
      // Combine and unique
      const combined = [...results, ...resultsEiin];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.tenant_id === v.tenant_id) === i);
      
      setSearchResults(unique);
    } catch (error: any) {
      toast.error("Search failed: " + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if ((role === "Teacher" || role === "Student") && !selectedTenant) {
      toast.error("অনুগ্রহ করে আপনার প্রতিষ্ঠানটি নির্বাচন করুন");
      return;
    }

    const regData: any = {
      role,
      name: formData.get('userName'),
      phone: formData.get('phone'),
      tenant_id: selectedTenant?.tenant_id || null,
    };

    if (role === "InstitutionAdmin") {
      regData.institutionType = formData.get('instType');
      regData.eiin = formData.get('eiin');
      regData.institutionName = formData.get('instName');
    } else if (role === "Student") {
      regData.department = formData.get('dept');
      regData.class = formData.get('class');
      regData.session = formData.get('session');
      regData.student_id = formData.get('roll'); // Roll as student_id
    }

    localStorage.setItem('pendingRegistration', JSON.stringify(regData));
    
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      // The auth state listener in a root layout or provider will handle the actual Firestore creation
      // For now, we redirect to dashboard which will trigger the auth check
      router.push("/auth/login"); 
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-[#6f42c1]">রেজিস্ট্রেশন করুন</h2>
            <p className="text-gray-500">আপনার সঠিক রোল নির্বাচন করে এগিয়ে যান</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 relative z-10">
              {[
                { id: "InstitutionAdmin", label: "Registration as Institute admin" },
                { id: "Teacher", label: "Registration as Teachers" },
                { id: "Student", label: "Registration as Students" }
              ].map((r) => (
                <label key={r.id} className={cn(
                  "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all flex-1",
                  role === r.id ? "border-[#6f42c1] bg-purple-50" : "border-gray-100 hover:border-gray-200"
                )}>
                  <input 
                    type="radio" 
                    name="role" 
                    checked={role === r.id} 
                    onChange={() => {
                      setRole(r.id as any);
                      setAgreed(false);
                      setSelectedTenant(null);
                    }}
                    className="w-4 h-4 text-[#6f42c1]"
                  />
                  <span className="text-sm font-bold text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {role === "InstitutionAdmin" && (
            <div className="space-y-6">
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-900 leading-relaxed">
                  “এই সিস্টেমটি পুরো প্রতিষ্ঠান বা নির্দিষ্ট বিভাগের জন্য সেটআপ করতে পারবেন। সেটআপ করার পর যদি সিস্টেমটি ৬০ দিন পর্যন্ত ব্যবহার না হয় তবে স্বয়ংক্রিয়ভাবে আপনার একাউন্টের সকল তথ্য মুছে যাবে।”
                </p>
                {!agreed && (
                  <button 
                    onClick={() => setAgreed(true)}
                    className="mt-4 bg-[#6f42c1] text-white px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-[#59359a] transition-colors"
                  >
                    I Agree
                  </button>
                )}
              </div>

              {agreed && (
                <form onSubmit={handleRegistration} className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">কোন ধরণের প্রতিষ্ঠান?</label>
                      <select required name="instType" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1] bg-white">
                        <option value="">নির্বাচন করুন</option>
                        <option value="School">স্কুল</option>
                        <option value="College">কলেজ</option>
                        <option value="Coaching Center">কোচিং সেন্টার</option>
                        <option value="Madrasa">মাদ্রাসা</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">প্রতিষ্ঠানের EIIN/Registration Number</label>
                      <input required name="eiin" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="EIIN লিখুন" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">প্রতিষ্ঠানের নাম (বাংলা/ইংরেজিতে)</label>
                      <input required name="instName" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="প্রতিষ্ঠানের নাম লিখুন" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">আপনার নাম (বাংলা/ইংরেজিতে)</label>
                      <input required name="userName" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="আপনার নাম লিখুন" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">আপনার মোবাইল নাম্বার (বাংলা/ইংরেজিতে)</label>
                      <input required name="phone" type="tel" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "রেজিস্ট্রেশন করুন"}
                  </button>
                </form>
              )}
            </div>
          )}

          {(role === "Teacher" || role === "Student") && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-900 leading-relaxed">
                  ”আপনার প্রতিষ্ঠানের বা বিভাগের জন্য এই সিস্টেমটি সেটআপ করা আছে কিনা তা দেখার জন্য EIIN/Registration Number বা নাম দিয়ে সার্চ করুন”
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="EIIN বা প্রতিষ্ঠানের নাম দিয়ে সার্চ করুন"
                    className="flex-1 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]"
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-[#6f42c1] text-white px-6 rounded-lg font-bold hover:bg-[#59359a] transition-colors"
                  >
                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>

                {searchResults.length > 0 && !selectedTenant && (
                  <div className="border rounded-xl divide-y bg-white overflow-hidden">
                    {searchResults.map(t => (
                      <button 
                        key={t.tenant_id}
                        onClick={() => setSelectedTenant(t)}
                        className="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-xs text-gray-400">EIIN: {t.eiin}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}

                {selectedTenant && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Selected Institution</p>
                      <p className="font-bold text-gray-800">{selectedTenant.name}</p>
                    </div>
                    <button onClick={() => setSelectedTenant(null)} className="text-xs font-bold text-red-500 uppercase hover:underline">Change</button>
                  </div>
                )}
              </div>

              {selectedTenant && (
                <form onSubmit={handleRegistration} className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">আপনার নাম (বাংলা/ইংরেজিতে)</label>
                      <input required name="userName" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="আপনার নাম লিখুন" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">আপনার মোবাইল নাম্বার (বাংলা/ইংরেজিতে)</label>
                      <input required name="phone" type="tel" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="01XXXXXXXXX" />
                    </div>
                    {role === "Student" && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">বিভাগ</label>
                          <input required name="dept" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="Science/Arts/Commerce" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">শ্রেণী</label>
                          <input required name="class" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="Class 10" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">সেশন</label>
                          <input required name="session" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="2023-24" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">রোল নাম্বার</label>
                          <input required name="roll" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="Roll No" />
                        </div>
                      </>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "রেজিস্ট্রেশন করুন"}
                  </button>
                </form>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

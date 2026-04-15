"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/src/lib/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  ChevronRight,
  Mail,
  Lock
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      regData.googleSheetId = formData.get('googleSheetId');
    } else if (role === "Student") {
      regData.department = formData.get('dept');
      regData.class = formData.get('class');
      regData.session = formData.get('session');
      regData.student_id = formData.get('roll'); // Roll as student_id
    }

    localStorage.setItem('pendingRegistration', JSON.stringify(regData));
    
    setLoading(true);
    try {
      if (email && password) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
      
      // The auth state listener in ClientLayout will handle the actual Firestore creation
      router.push("/auth/login"); 
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 font-english">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-[#6f42c1]" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">রেজিস্ট্রেশন করুন</h2>
            <p className="text-sm text-gray-500 font-bengali">আপনার সঠিক রোল নির্বাচন করে এগিয়ে যান</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 relative z-10">
              {[
                { id: "InstitutionAdmin", label: "Institute Admin" },
                { id: "Teacher", label: "Teacher" },
                { id: "Student", label: "Student" }
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
                <p className="text-sm text-purple-900 leading-relaxed font-bengali">
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
                <form onSubmit={handleRegistration} className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Institution Type</label>
                      <select required name="instType" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] bg-white text-sm">
                        <option value="">নির্বাচন করুন</option>
                        <option value="School">স্কুল</option>
                        <option value="College">কলেজ</option>
                        <option value="Coaching Center">কোচিং সেন্টার</option>
                        <option value="Madrasa">মাদ্রাসা</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">EIIN / Reg No</label>
                      <input required name="eiin" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="EIIN লিখুন" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Institution Name</label>
                      <input required name="instName" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="প্রতিষ্ঠানের নাম লিখুন" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Master Google Sheet ID</label>
                      <input required name="googleSheetId" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="Google Sheet ID লিখুন" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                      <input required name="userName" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="আপনার নাম লিখুন" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input required name="phone" type="tel" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="01XXXXXXXXX" />
                    </div>

                    <div className="md:col-span-2 border-t border-gray-100 pt-6 space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            required 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" 
                            placeholder="name@institution.com" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            required 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" 
                            placeholder="••••••••" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "রেজিস্ট্রেশন করুন"}
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or</span></div>
                  </div>

                  <button 
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                        router.push("/auth/login");
                      } catch (error: any) {
                        toast.error(error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Google দিয়ে রেজিস্ট্রেশন
                  </button>
                </form>
              )}
            </div>
          )}

          {(role === "Teacher" || role === "Student") && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-900 leading-relaxed font-bengali">
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
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm"
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-[#6f42c1] text-white px-6 rounded-xl font-bold hover:bg-[#59359a] transition-colors"
                  >
                    {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>

                {searchResults.length > 0 && !selectedTenant && (
                  <div className="border border-gray-100 rounded-xl divide-y bg-white overflow-hidden shadow-sm">
                    {searchResults.map(t => (
                      <button 
                        key={t.tenant_id}
                        onClick={() => setSelectedTenant(t)}
                        className="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center transition-colors"
                      >
                        <div>
                          <p className="font-bold text-sm text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">EIIN: {t.eiin}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </button>
                    ))}
                  </div>
                )}

                {selectedTenant && (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Selected Institution</p>
                      <p className="font-bold text-gray-800">{selectedTenant.name}</p>
                    </div>
                    <button onClick={() => setSelectedTenant(null)} className="text-xs font-bold text-red-500 uppercase hover:underline">Change</button>
                  </div>
                )}
              </div>

              {selectedTenant && (
                <form onSubmit={handleRegistration} className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                      <input required name="userName" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="আপনার নাম লিখুন" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input required name="phone" type="tel" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="01XXXXXXXXX" />
                    </div>
                    {role === "Student" && (
                      <>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Department</label>
                          <input required name="dept" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="Science/Arts/Commerce" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Class</label>
                          <input required name="class" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="Class 10" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Session</label>
                          <input required name="session" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="2023-24" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Roll Number</label>
                          <input required name="roll" type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" placeholder="Roll No" />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2 border-t border-gray-100 pt-6 space-y-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            required 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" 
                            placeholder="name@institution.com" 
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input 
                            required 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-12 py-3.5 outline-none focus:ring-2 focus:ring-[#6f42c1] transition-all text-sm" 
                            placeholder="••••••••" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 text-sm">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "রেজিস্ট্রেশন করুন"}
                  </button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or</span></div>
                  </div>

                  <button 
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const provider = new GoogleAuthProvider();
                        await signInWithPopup(auth, provider);
                        router.push("/auth/login");
                      } catch (error: any) {
                        toast.error(error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Google দিয়ে রেজিস্ট্রেশন
                  </button>
                </form>
              )}
            </div>
          )}
          
          <div className="pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-bengali">
              ইতিমধ্যে অ্যাকাউন্ট আছে? <Link href="/auth/login" className="text-[#6f42c1] font-bold hover:underline">লগইন করুন</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

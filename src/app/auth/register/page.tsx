"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/src/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  Check,
  Building2,
  GraduationCap,
  Users
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { cn } from "@/src/lib/utils";

type Role = "InstitutionAdmin" | "Teacher" | "Student";

const ACADEMIC_LEVELS = [
  "Play", "Nursery", "Primary (Class 1-5)", "High (Class 6-10)", "Class Eleven", "Class Twelve", "Degree", "Honours", "Preliminary to Masters", "Masters", "Training", "Vocational", "Diploma"
];

const INST_TYPES = [
  "University", "College", "School", "School and College", "Madrasha", "Coaching Center", "Training Institute", "Polytechnic"
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  
  // Admin Form State
  const [agreed, setAgreed] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [showDept, setShowDept] = useState(false);
  
  // Teacher/Student Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    setShowDept(
      selectedLevels.includes("Honours") || 
      selectedLevels.includes("Masters") || 
      selectedLevels.includes("Preliminary to Masters") ||
      selectedLevels.includes("Degree")
    );
  }, [selectedLevels]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/institutions/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setSearching(false);
    }
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeRole) return;

    const formData = new FormData(e.currentTarget);
    const data: any = {
      role: activeRole,
      name: formData.get("nameEN"),
      nameBN: formData.get("nameBN"),
      phone: formData.get("phone"),
    };

    if (activeRole === "InstitutionAdmin") {
      data.institutionType = formData.get("instType");
      data.eiin = formData.get("eiin");
      data.institutionNameEN = formData.get("instNameEN");
      data.institutionNameBN = formData.get("instNameBN");
      data.academicLevels = selectedLevels;
      data.department = formData.get("dept");
      data.adminName = formData.get("nameEN");
      if (selectedLevels.length === 0) {
        toast.error("কমপক্ষে একটি একাডেমিক লেভেল নির্বাচন করুন");
        return;
      }
    } else {
      if (!selectedTenant) {
        toast.error("অনুগ্রহ করে আপনার প্রতিষ্ঠানটি নির্বাচন করুন");
        return;
      }
      data.tenant_id = selectedTenant.tenant_id;
      data.institutionName = selectedTenant.name;
      
      if (activeRole === "Student") {
        data.department = formData.get("dept");
        data.class = formData.get("class");
        data.session = formData.get("session");
      }
    }

    // Save to localStorage temporarily
    localStorage.setItem("pendingRegistration", JSON.stringify(data));
    
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // ClientLayout will handle the Firestore record creation upon auth change
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-montserrat antialiased">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-purple-600 rounded-3xl shadow-xl shadow-purple-200">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-center">নিবন্ধন করুন</h1>
          <p className="text-slate-500 font-bengali text-lg text-center">আপনার সঠিক ভূমিকা নির্বাচন করুন</p>
        </div>

        {/* Roles Accordion */}
        <div className="space-y-4">
          {/* Institution Admin */}
          <RoleAccordion 
            id="InstitutionAdmin"
            title="ইনস্টিটিউট এডমিন (প্রতিষ্ঠানের জন্য)"
            icon={<Building2 className="w-5 h-5" />}
            active={activeRole === "InstitutionAdmin"}
            onClick={() => setActiveRole("InstitutionAdmin")}
          >
            <div className="space-y-6 pt-2 font-bengali">
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                <p className="text-sm text-purple-900 leading-relaxed">
                  “এই সিস্টেমটি পুরো প্রতিষ্ঠান বা নির্দিষ্ট বিভাগের জন্য সেটআপ করতে পারবেন। সেটআপ করার পর যদি সিস্টেমটি ৬০ দিন পর্যন্ত ব্যবহার না হয় তবে স্বয়ংক্রিয়ভাবে আপনার একাউন্টের সকল তথ্য মুছে যাবে।”
                </p>
                <label className="mt-4 flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    agreed ? "bg-purple-600 border-purple-600" : "bg-white border-purple-200"
                  )}>
                    {agreed && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                  <span className="text-sm font-bold text-slate-700 select-none">আমি একমত</span>
                </label>
              </div>

              {agreed && (
                <form onSubmit={handleRegistration} className="space-y-5 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <FieldGroup label="Institution Type">
                      <select required name="instType" className="input-field">
                        <option value="">নির্বাচন করুন</option>
                        {INST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FieldGroup>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Academic Levels</label>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                         {ACADEMIC_LEVELS.map(level => (
                           <button
                             key={level}
                             type="button"
                             onClick={() => toggleLevel(level)}
                             className={cn(
                               "px-3 py-2 rounded-xl text-xs font-medium transition-all text-center flex items-center justify-center",
                               selectedLevels.includes(level) 
                                 ? "bg-purple-600 text-white shadow-md shadow-purple-200" 
                                 : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300"
                             )}
                           >
                             {level}
                           </button>
                         ))}
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldGroup label="EIIN / Reg No">
                        <input required name="eiin" type="text" className="input-field font-montserrat" placeholder="EIIN" />
                      </FieldGroup>
                      {showDept && (
                        <FieldGroup label="Department/Faculty">
                          <input required name="dept" type="text" className="input-field" placeholder="উদা: বাংলা বিভাগ" />
                        </FieldGroup>
                      )}
                    </div>

                    <FieldGroup label="Institution Name (English)">
                      <input required name="instNameEN" type="text" className="input-field font-montserrat" placeholder="Institution Name" />
                    </FieldGroup>

                    <FieldGroup label="প্রতিষ্ঠানের নাম (বাংলা)">
                      <input required name="instNameBN" type="text" className="input-field" placeholder="প্রতিষ্ঠানের নাম" />
                    </FieldGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldGroup label="Admin Name (EN)">
                        <input required name="nameEN" type="text" className="input-field font-montserrat" placeholder="Your Name" />
                      </FieldGroup>
                      <FieldGroup label="এডমিন এর নাম (বাংলা)">
                        <input required name="nameBN" type="text" className="input-field" placeholder="আপনার নাম" />
                      </FieldGroup>
                    </div>

                    <FieldGroup label="Mobile Number">
                      <input required name="phone" type="tel" className="input-field font-montserrat" placeholder="01XXXXXXXXX" />
                    </FieldGroup>
                  </div>

                  <SubmitButton loading={loading} label="রেজিস্ট্রেশন করুন" />
                </form>
              )}
            </div>
          </RoleAccordion>

          {/* Teacher */}
          <RoleAccordion 
            id="Teacher"
            title="শিক্ষক (Teacher)"
            icon={<GraduationCap className="w-5 h-5" />}
            active={activeRole === "Teacher"}
            onClick={() => { setActiveRole("Teacher"); setSelectedTenant(null); }}
          >
            <div className="space-y-6 pt-2 font-bengali">
              <SearchSection 
                searchQuery={searchQuery}
                handleSearch={handleSearch}
                searching={searching}
                searchResults={searchResults}
                selectedTenant={selectedTenant}
                setSelectedTenant={setSelectedTenant}
              />

              {selectedTenant && (
                <form onSubmit={handleRegistration} className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Teacher Name (English)">
                      <input required name="nameEN" type="text" className="input-field font-montserrat" placeholder="Teacher Name" />
                    </FieldGroup>
                    <FieldGroup label="শিক্ষকের নাম (বাংলা)">
                      <input required name="nameBN" type="text" className="input-field" placeholder="আপনার নাম" />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Mobile Number">
                    <input required name="phone" type="tel" className="input-field font-montserrat" placeholder="01XXXXXXXXX" />
                  </FieldGroup>
                  <SubmitButton loading={loading} label="নিবন্ধন করুন" />
                </form>
              )}
            </div>
          </RoleAccordion>

          {/* Student */}
          <RoleAccordion 
            id="Student"
            title="শিক্ষার্থী (Student)"
            icon={<Users className="w-5 h-5" />}
            active={activeRole === "Student"}
            onClick={() => { setActiveRole("Student"); setSelectedTenant(null); }}
          >
            <div className="space-y-6 pt-2 font-bengali">
              <SearchSection 
                searchQuery={searchQuery}
                handleSearch={handleSearch}
                searching={searching}
                searchResults={searchResults}
                selectedTenant={selectedTenant}
                setSelectedTenant={setSelectedTenant}
              />

              {selectedTenant && (
                <form onSubmit={handleRegistration} className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                  <FieldGroup label="Student Name (English)">
                    <input required name="nameEN" type="text" className="input-field font-montserrat" placeholder="Student Name" />
                  </FieldGroup>
                  <FieldGroup label="Mobile Number">
                    <input required name="phone" type="tel" className="input-field font-montserrat" placeholder="01XXXXXXXXX" />
                  </FieldGroup>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Department">
                      <input required name="dept" type="text" className="input-field" placeholder="বিভাগ" />
                    </FieldGroup>
                    <FieldGroup label="Class">
                      <input required name="class" type="text" className="input-field" placeholder="শ্রেণী" />
                    </FieldGroup>
                  </div>
                  
                  <FieldGroup label="Session / Year">
                    <input required name="session" type="text" className="input-field font-montserrat" placeholder="2023-24" />
                  </FieldGroup>

                  <SubmitButton loading={loading} label="নিবন্ধন সম্পন্ন করুন" />
                </form>
              )}
            </div>
          </RoleAccordion>
        </div>

        {/* Footer Link */}
        <div className="text-center font-bengali">
          <p className="text-slate-500">
            ইতিমধ্যে অ্যাকাউন্ট আছে? {" "}
            <button 
              onClick={() => router.push("/auth/login")}
              className="text-purple-600 font-bold hover:underline"
            >
              লগইন করুন
            </button>
          </p>
        </div>
      </div>

      <style jsx global>{`
        .input-field {
          width: 100%;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus {
          border-color: #9333ea;
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.1);
        }
      `}</style>
    </div>
  );
}

// Helper Components
function RoleAccordion({ id, title, icon, active, children, onClick }: any) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      active ? "border-purple-600 ring-4 ring-purple-100" : "border-slate-200 hover:border-purple-300"
    )}>
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl transition-colors",
            active ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"
          )}>
            {icon}
          </div>
          <span className={cn(
            "font-bold text-lg font-bengali text-left",
            active ? "text-purple-900" : "text-slate-700"
          )}>
            {title}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-slate-400 transition-transform duration-300",
          active && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "px-5 overflow-hidden transition-all duration-300",
        active ? "max-h-[1500px] mb-6 opacity-100" : "max-h-0 opacity-0"
      )}>
        {children}
      </div>
    </Card>
  );
}

function FieldGroup({ label, children }: any) {
  return (
    <div className="space-y-1.5 font-bengali">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      {children}
    </div>
  );
}

function SearchSection({ searchQuery, handleSearch, searching, searchResults, selectedTenant, setSelectedTenant }: any) {
  return (
    <div className="space-y-4">
      <p className="text-slate-600 text-sm">
        আপনার প্রতিষ্ঠানের জন্য এই সিস্টেমটি সেটআপ করা আছে কিনা তা দেখার জন্য EIIN বা নাম দিয়ে সার্চ করুন
      </p>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="EIIN বা প্রতিষ্ঠানের নাম..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 transition-all font-english"
        />
        {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-purple-600" />}
      </div>

      {searchResults.length > 0 && !selectedTenant && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden divide-y divide-slate-50">
          {searchResults.map((t: any) => (
            <button 
              key={t.tenant_id}
              onClick={() => setSelectedTenant(t)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
            >
              <div>
                <h4 className="font-bold text-slate-900">{t.name}</h4>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">EIIN: {t.eiin}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-600" />
            </button>
          ))}
        </div>
      )}

      {searchQuery.length >= 2 && searchResults.length === 0 && !searching && !selectedTenant && (
        <div className="text-center py-4 text-slate-500">
          কোন প্রতিষ্ঠান পাওয়া যায়নি
        </div>
      )}

      {selectedTenant && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg text-white">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">নির্বাচিত প্রতিষ্ঠান</p>
              <h4 className="font-bold text-slate-900">{selectedTenant.name}</h4>
            </div>
          </div>
          <button 
            onClick={() => setSelectedTenant(null)}
            className="text-xs font-bold text-red-500 hover:text-red-600 uppercase transition-colors"
          >
            পরিবর্তন করুন
          </button>
        </div>
      )}
    </div>
  );
}

function SubmitButton({ loading, label }: any) {
  return (
    <button 
      type="submit" 
      disabled={loading} 
      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold uppercase tracking-wider hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3 active:scale-[0.98]"
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {label}
        </>
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  GraduationCap,
  Mail,
  Smartphone,
  BookOpen,
  Filter,
  UserPlus,
  Loader2,
  Layers,
  Calendar,
  FileDown,
  FileUp,
  X,
  AlertCircle
} from "lucide-react";
import { collection, query, onSnapshot, where, doc } from "firebase/firestore";
import { db, auth } from "@/src/lib/firebase";
import { useAuth } from "@/src/hooks/useAuth";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { SlideOverForm } from "@/src/components/shared/SlideOverForm";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import Image from "next/image";
import { Tenant } from "@/src/lib/types";
import Papa from "papaparse";

interface Student {
  user_id: string;
  student_id: string;
  name: string;
  email: string;
  class: string;
  section: string;
  session: string;
  department: string;
  phone: string;
  status: "pending" | "approved" | "deleted";
  created_at: string;
  photo_url?: string;
}

export default function TeacherStudentsPage() {
  const { userData, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterClass, setFilterClass] = useState("all");

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

// Form State
  const [formData, setFormData] = useState({
    name: "",
    identifier: "",
    identifierType: "username" as "email" | "username",
    password: "", 
    class: "",
    section: "",
    session: "",
    department: "",
    phone: "",
    student_id: "",
  });

  useEffect(() => {
    if (!userData?.tenant_id) return;

    const tenantId = userData.tenant_id;

    // 1. Fetch Students
    const q = query(
      collection(db, "users"),
      where("tenant_id", "==", tenantId),
      where("role", "==", "student") 
    );

    const unsubStudents = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ user_id: d.id, ...d.data() } as Student));
      setStudents(docs.filter(s => s.status !== "deleted"));
      setLoading(false);
    });

    // 2. Fetch Tenant Settings for dropdowns
    const unsubTenant = onSnapshot(doc(db, "tenants", tenantId), (snap) => {
      if (snap.exists()) {
        setTenant(snap.data() as Tenant);
      }
    });

    return () => {
      unsubStudents();
      unsubTenant();
    };
  }, [userData]);

  const downloadTemplate = () => {
    const headers = [
      "Institute Name",
      "Academic Level (Class)",
      "Section",
      "Department/Group",
      "Session",
      "Name (Student Full Name)",
      "Roll",
      "Registration No",
      "Year",
      "Email",
      "Mobile",
      "Father Name",
      "Mother Name",
      "Guardian Mobile"
    ];
    
    const sampleRow = [
      tenant?.name || "Mobile Hajira Institute", 
      "Class 10", 
      "A",
      "Science", 
      new Date().getFullYear().toString(), 
      "Abdur Rahman", 
      "01", 
      "12345678", 
      new Date().getFullYear().toString(), 
      "", 
      "01712345678", 
      "Kamal Ahmed", 
      "Fatema Begum", 
      "01812345678"
    ];

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, sampleRow].map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        const mappedData = results.data.map((row: any) => ({
          academicLevel: row["Academic Level (Class)"] || row["Class"] || "",
          section: row["Section"] || "",
          department: row["Department/Group"] || row["Department"] || row["Group"] || "",
          session: row["Session"] || "",
          name: row["Name (Student Full Name)"] || row["Name"] || "",
          roll: row["Roll"] || row["ID"] || "",
          registrationNo: row["Registration No"] || "",
          year: row["Year"] || "",
          email: row["Email"] || "",
          mobile: row["Mobile"] || row["Phone"] || "",
          fatherName: row["Father Name"] || "",
          motherName: row["Mother Name"] || "",
          guardianMobile: row["Guardian Mobile"] || ""
        }));

        setImportData(mappedData.filter((d: any) => d.name));
        setIsImportModalOpen(true);
      },
      error: (err: Error) => {
        toast.error("CSV ফাইল পড়তে সমস্যা হয়েছে: " + err.message);
      }
    });

    e.target.value = "";
  };

  const processImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    const toastId = toast.loading(`${importData.length} জন শিক্ষার্থী যোগ করা হচ্ছে...`);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/students/batch-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ students: importData })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "ইমপোর্ট ব্যর্থ হয়েছে");

      toast.success(`সাফল্য: ${result.results.success}, ব্যর্থ: ${result.results.failed}`, { id: toastId });
      
      setIsImportModalOpen(false);
      setImportData([]);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class) return toast.error("ক্লাস নির্বাচন করুন");
    setSubmitting(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/users/manage", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: userData?.tenant_id,
          role: "Student",
          name: formData.name,
          identifier: formData.identifier,
          identifierType: formData.identifierType,
          password: formData.password || "123456",
          extra_data: {
            class: formData.class,
            section: formData.section,
            session: formData.session,
            department: formData.department,
            phone: formData.phone,
            student_id: formData.student_id
          }
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "শিক্ষার্থী যোগ করতে ব্যর্থ হয়েছে");

      toast.success("শিক্ষার্থীর প্রোফাইল সফলভাবে তৈরি করা হয়েছে।");
      setIsAdding(false);
      setFormData({ 
        name: "", identifier: "", identifierType: "username", password: "", 
        class: "", section: "", session: "", department: "", phone: "", student_id: "" 
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "শিক্ষার্থী",
      accessorKey: "name",
      cell: (s: Student) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden text-purple-600">
            {s.photo_url ? (
              <Image src={s.photo_url} alt={s.name} width={40} height={40} className="object-cover" referrerPolicy="no-referrer" />
            ) : (
              <GraduationCap className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900">{s.name}</p>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ID: {s.student_id || "N/A"}</p>
          </div>
        </div>
      )
    },
    {
      header: "ক্লাস ও সেকশন",
      accessorKey: "class",
      cell: (s: Student) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-black uppercase tracking-widest border border-purple-100">
              {s.class || "N/A"}
            </span>
            <span className="text-xs font-bold text-gray-700">{s.section ? `${s.section}` : ""}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium tracking-tight">
            <Calendar className="w-3 h-3" /> {s.session || "N/A"} 
          </div>
        </div>
      )
    },
    {
      header: "যোগাযোগ",
      accessorKey: "phone",
      cell: (s: Student) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
            <Smartphone className="w-3 h-3" /> {s.phone || "N/A"}
          </div>
        </div>
      )
    },
    {
      header: "অ্যাকশন",
      accessorKey: "user_id",
      cell: (s: Student) => (
        <button 
          onClick={async () => {
             if (!confirm(`${s.name} কে বাদ দিতে চান?`)) return;
             // Teachers might only soft delete or just remove from view logic
             toast.error("শুধুমাত্র এডমিন শিক্ষার্থী মুছতে পারবেন।");
          }}
          className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  const classes = Array.prototype.concat("all", Array.from(new Set(students.map(s => s.class).filter(Boolean))));
  const filteredStudents = filterClass === "all" ? students : students.filter(s => s.class === filterClass);

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#6f42c1]" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-bengali">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-1">
            <GraduationCap className="w-8 h-8 text-[#6f42c1]" /> আমার শিক্ষার্থী
          </h1>
          <p className="text-gray-500 font-medium">শিক্ষার্থীদের তালিকা দেখুন এবং হাজিরা নিশ্চিত করুন।</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={downloadTemplate}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <FileDown className="w-4 h-4 text-[#6f42c1]" /> টেমপ্লেট
          </button>

          <label className="bg-white border border-gray-200 hover:border-[#6f42c1] text-gray-700 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap">
            <FileUp className="w-4 h-4 text-[#6f42c1]" /> ইমপোর্ট
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          </label>

          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#6f42c1] hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" /> শিক্ষার্থী যোগ
          </button>
        </div>
      </div>

      <Card className="p-4 border-transparent shadow-xl shadow-purple-500/5 rounded-2xl flex items-center gap-3 overflow-x-auto no-scrollbar">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        {classes.map((cls) => (
          <button
            key={cls}
            onClick={() => setFilterClass(cls)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shrink-0 transition-all ${
              filterClass === cls 
              ? "bg-[#6f42c1] text-white shadow-lg shadow-purple-600/20" 
              : "text-gray-400 hover:bg-purple-50"
            }`}
          >
            {cls === "all" ? "সবাই" : cls}
          </button>
        ))}
      </Card>

      <Card className="overflow-hidden border-transparent shadow-2xl shadow-purple-500/5 rounded-[2rem]">
        <DataTable 
          columns={columns} 
          data={filteredStudents} 
          searchPlaceholder="নাম বা আইডি খুঁজুন..."
        />
      </Card>

      {/* SlideOver Form */}
      <SlideOverForm
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="নতুন শিক্ষার্থী"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <input 
              required
              type="text" 
              placeholder="নাম"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none transition-all"
            />
            <div className="grid grid-cols-2 gap-4">
              <select 
                required
                value={formData.class}
                onChange={e => setFormData({...formData, class: e.target.value})}
                className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
              >
                <option value="">ক্লাস</option>
                {tenant?.classes?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input 
                type="text" 
                placeholder="রোল"
                value={formData.student_id}
                onChange={e => setFormData({...formData, student_id: e.target.value})}
                className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
              />
            </div>
            <input 
              required
              type="tel" 
              placeholder="ফোন"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none transition-all"
            />
            <input 
              required
              type="text" 
              placeholder="ইউজারনেম (আইডি)"
              value={formData.identifier}
              onChange={e => setFormData({...formData, identifier: e.target.value})}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none transition-all"
            />
            <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "সেভ করুন"}
            </button>
        </form>
      </SlideOverForm>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border-0 shadow-2xl rounded-[2rem]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">ইমপোর্ট প্রিভিউ ({importData.length})</h2>
              <button onClick={() => setIsImportModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
               <table className="w-full text-sm">
                  <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                    <tr>
                      <th className="px-4 py-3 text-left">নাম</th>
                      <th className="px-4 py-3 text-left">ক্লাস</th>
                      <th className="px-4 py-3 text-left">রোল</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {importData.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-bold">{r.name}</td>
                        <td className="px-4 py-3 text-purple-600">{r.academicLevel}</td>
                        <td className="px-4 py-3 font-black">{r.roll}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-3 font-black text-[10px] uppercase text-gray-400">বাতিল</button>
              <button 
                onClick={processImport} 
                disabled={importing}
                className="bg-[#6f42c1] text-white px-10 py-4 rounded-xl font-black text-sm uppercase shadow-lg shadow-purple-200"
              >
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : "ইমপোর্ট করুন"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

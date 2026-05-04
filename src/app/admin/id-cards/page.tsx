"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Check, 
  Square, 
  CheckSquare,
  Loader2,
  ChevronRight,
  GraduationCap,
  Layers,
  Settings2,
  Palette,
  FileText,
  FileImage,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/shared/DataTable";
import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

// --- Types ---
interface Student {
  user_id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  photo_url?: string;
  blood_group?: string;
  phone?: string;
  father_name?: string;
}

interface CardConfig {
  primaryColor: string;
  frameStyle: "modern" | "classic" | "minimal" | "gradient" | "tech";
  showQrCode: boolean;
}

export default function AdminIDCardsPage() {
  const { userData, tenant, loading: authLoading } = useAuth();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  
  // Design Config
  const [config, setConfig] = useState<CardConfig>({
    primaryColor: "#6f42c1",
    frameStyle: "modern",
    showQrCode: true,
  });

  const hiddenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData?.tenant_id) return;

    const q = query(
      collection(db, "users"),
      where("tenant_id", "==", userData.tenant_id),
      where("role", "==", "student")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ user_id: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(false);
    });

    return () => unsub();
  }, [userData]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.user_id)));
    }
  };

  const generateBulkPDF = async () => {
    if (selectedIds.size === 0) return toast.error("অনুগ্রহ করে শিক্ষার্থী সিলেক্ট করুন");
    
    setGenerating(true);
    const toastId = toast.loading(`${selectedIds.size} জন শিক্ষার্থীর আইডি কার্ড তৈরি হচ্ছে...`);
    
    try {
      const selectedStudents = students.filter(s => selectedIds.has(s.user_id));
      const pdf = new jsPDF("p", "mm", "a4");
      
      const cardWidth = 54;
      const cardHeight = 85.6;
      const margin = 10;
      const gap = 5;
      
      let x = margin;
      let y = margin;
      let count = 0;

      for (const student of selectedStudents) {
        // Generate high-res image for each card
        const cardImage = await renderCardToImage(student);
        
        if (count > 0 && count % 8 === 0) {
          pdf.addPage();
          x = margin;
          y = margin;
        }

        pdf.addImage(cardImage, "PNG", x, y, cardWidth, cardHeight);
        
        count++;
        x += cardWidth + gap;
        if (x + cardWidth > 210 - margin) {
          x = margin;
          y += cardHeight + gap;
        }
      }

      pdf.save(`Bulk_ID_Cards_${new Date().toLocaleDateString()}.pdf`);
      toast.success("সবগুলো আইডি কার্ড সফলভাবে তৈরি হয়েছে!", { id: toastId });
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("আইডি কার্ড তৈরিতে সমস্যা হয়েছে", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const renderCardToImage = async (student: Student): Promise<string> => {
    // Create a temporary hidden element to render the card
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = "-9999px";
    document.body.appendChild(div);

    // Generate QR Data URL
    const qrUrl = await QRCode.toDataURL(student.student_id || "000000", { margin: 1, color: { dark: config.primaryColor } });

    // Build card HTML structure (Simplified for speed)
    div.innerHTML = `
      <div style="width: 300px; height: 480px; background: white; border-radius: 20px; overflow: hidden; position: relative; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; border: 1px solid #eee;">
        <div style="background: ${config.primaryColor}; height: 100px; width: 100%; position: absolute; top: 0;"></div>
        <div style="z-index: 10; padding: 30px 20px; text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center;">
           <span style="color: white; font-size: 8px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">ID CARD</span>
           <span style="color: white; font-size: 10px; font-weight: bold; margin-top: 5px; display: block;">${tenant?.name || "INSTITUTE"}</span>
           
           <div style="margin-top: 30px; width: 110px; height: 110px; border-radius: 50%; border: 4px solid ${config.primaryColor}; background: #f0f0f0; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
              <img src="${student.photo_url || 'https://avatar.iran.liara.run/public/student'}" style="width: 100%; height: 100%; object-fit: cover;" />
           </div>

           <h3 style="margin-top: 20px; font-size: 20px; font-weight: 900; color: #1a1a1a; margin-bottom: 5px;">${student.name}</h3>
           <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
              <span style="background: ${config.primaryColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${student.student_id}</span>
              <span style="font-size: 12px; color: #666; font-weight: bold;">${student.class} (${student.section || "N/A"})</span>
           </div>

           <div style="width: 100%; margin-top: 30px; text-align: left; padding: 0 20px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f5; padding-bottom: 5px; margin-bottom: 10px;">
                 <span style="font-size: 10px; color: #999; font-weight: 900; text-transform: uppercase;">Blood</span>
                 <span style="font-size: 12px; font-weight: bold; color: #d32f2f;">${student.blood_group || "N/A"}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f5f5f5; padding-bottom: 5px;">
                 <span style="font-size: 10px; color: #999; font-weight: 900; text-transform: uppercase;">Phone</span>
                 <span style="font-size: 12px; font-weight: bold; color: #333;">${student.phone || "N/A"}</span>
              </div>
           </div>

           <div style="margin-top: auto; padding-top: 20px;">
              ${config.showQrCode ? `<img src="${qrUrl}" style="width: 70px; height: 70px; border: 1px solid #eee; padding: 5px; border-radius: 10px;" />` : ""}
           </div>
        </div>
      </div>
    `;

    const canvas = await html2canvas(div, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    document.body.removeChild(div);
    return imgData;
  };

  const classes = Array.from(new Set(students.map(s => s.class))).filter(Boolean);
  const filteredStudents = filterClass === "all" ? students : students.filter(s => s.class === filterClass);

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#6f42c1]" /></div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20 font-bengali">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-8 pb-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-200">
                <CreditCard className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">ID কার্ড ম্যানেজমেন্ট</h1>
                <p className="text-gray-500 text-sm mt-0.5">শিক্ষার্থীদের জন্য ডিজিটাল আইডি কার্ড তৈরি করুন।</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={generateBulkPDF}
                disabled={generating || selectedIds.size === 0}
                className="flex items-center gap-2 bg-[#6f42c1] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-purple-100 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />} 
                ({selectedIds.size}) বাল্ক জেনারেট করুন
              </button>
           </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Options Side */}
            <div className="lg:col-span-3 space-y-6">
               <Card className="p-6 border-none shadow-sm">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-6">
                     <Palette className="w-4 h-4 text-purple-600" /> কার্ড ডিজাইন
                  </h3>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">ব্র্যান্ড কালার</label>
                        <div className="flex flex-wrap gap-2">
                           {['#6f42c1', '#1a73e8', '#00c853', '#d50000', '#212121'].map(c => (
                             <button 
                               key={c}
                               onClick={() => setConfig({...config, primaryColor: c})}
                               style={{ backgroundColor: c }}
                               className={cn(
                                 "w-10 h-10 rounded-full border-2 transition-all",
                                 config.primaryColor === c ? "border-[#6f42c1] scale-110 shadow-md" : "border-transparent"
                               )}
                             />
                           ))}
                        </div>
                     </div>

                     <div className="pt-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={config.showQrCode} 
                             onChange={e => setConfig({...config, showQrCode: e.target.checked})}
                             className="w-4 h-4 accent-purple-600" 
                           />
                           <span className="text-sm font-bold text-gray-700">QR কোড দেখান</span>
                        </label>
                     </div>
                  </div>
               </Card>

               <Card className="p-6 border-none shadow-sm bg-purple-50">
                  <div className="flex flex-col items-center text-center">
                     <p className="text-xs text-purple-700 font-bold mb-4">কাস্টম কার্ড তৈরি করতে চান?</p>
                     <a 
                       href="/id-card/generate" 
                       target="_blank"
                       className="w-full py-3 bg-white text-purple-600 rounded-xl text-xs font-black shadow-sm border border-purple-100 hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                     >
                       পাবলিক জেনারেটর <ChevronRight className="w-3 h-3" />
                     </a>
                  </div>
               </Card>
            </div>

            {/* Students List */}
            <div className="lg:col-span-9 space-y-6">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                     <button
                       onClick={() => setFilterClass("all")}
                       className={cn(
                         "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                         filterClass === "all" ? "bg-purple-600 text-white shadow-lg" : "bg-white text-gray-400 hover:bg-purple-50"
                       )}
                     >
                        সবাই
                     </button>
                     {classes.map(c => (
                       <button
                         key={c}
                         onClick={() => setFilterClass(c)}
                         className={cn(
                           "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all",
                           filterClass === c ? "bg-purple-600 text-white shadow-lg" : "bg-white text-gray-400 hover:bg-purple-50"
                         )}
                       >
                         {c}
                       </button>
                     ))}
                  </div>

                  <div className="flex items-center gap-2">
                     <button 
                       onClick={toggleAll}
                       className="text-xs font-bold text-[#6f42c1] bg-purple-50 px-4 py-2 rounded-xl"
                     >
                       {selectedIds.size === filteredStudents.length ? "সব আন-সিলেক্ট" : "সব সিলেক্ট"}
                     </button>
                  </div>
               </div>

               <Card className="overflow-hidden border-none shadow-sm rounded-3xl">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                       <Loader2 className="w-10 h-10 animate-spin text-purple-300" />
                       <p className="text-gray-400 animate-pulse">শিক্ষার্থীদের তালিকা লোড হচ্ছে...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 p-1 bg-gray-100">
                       {filteredStudents.map((s) => (
                         <div 
                           key={s.user_id}
                           onClick={() => toggleSelect(s.user_id)}
                           className={cn(
                             "relative p-4 bg-white transition-all cursor-pointer group flex items-center gap-4",
                             selectedIds.has(s.user_id) ? "ring-2 ring-inset ring-purple-600 bg-purple-50/50" : "hover:bg-gray-50"
                           )}
                         >
                            <div className="shrink-0 relative">
                               <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                  <img src={s.photo_url || "https://avatar.iran.liara.run/public/student"} alt={s.name} className="w-full h-full object-cover" />
                               </div>
                               <div className={cn(
                                 "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center transition-all",
                                 selectedIds.has(s.user_id) ? "bg-purple-600 scale-110" : "bg-gray-200"
                               )}>
                                  {selectedIds.has(s.user_id) && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                               </div>
                            </div>
                            
                            <div className="flex-1 overflow-hidden">
                               <p className="font-bold text-gray-900 truncate">{s.name}</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.class} ({s.section || "-"}) • ID: {s.student_id}</p>
                            </div>
                            
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                               <ChevronRight className="w-4 h-4 text-gray-300" />
                            </div>
                         </div>
                       ))}
                    </div>
                  )}

                  {!loading && filteredStudents.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                       <GraduationCap className="w-16 h-16 text-gray-100 mb-4" />
                       <p className="text-gray-400 font-bold">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                    </div>
                  )}
               </Card>
            </div>
         </div>
      </main>

      {/* Hidden container for rendering */}
      <div ref={hiddenRef} className="hidden" />
    </div>
  );
}

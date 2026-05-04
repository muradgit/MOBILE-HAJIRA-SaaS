"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  CreditCard, 
  Download, 
  Settings2, 
  User, 
  Camera, 
  Layers, 
  Palette, 
  Layout,
  QrCode as QrIcon,
  RefreshCw,
  Eye,
  Check,
  ChevronRight,
  Plus,
  Loader2,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Link from "next/link";

// --- Types ---
interface IDCardData {
  name: string;
  studentId: string;
  class: string;
  section: string;
  bloodGroup: string;
  phone: string;
  fatherName: string;
  expiryDate: string;
  instituteName: string;
  photoUrl: string;
}

interface CardConfig {
  primaryColor: string;
  secondaryColor: string;
  frameStyle: "modern" | "classic" | "minimal" | "gradient" | "tech";
  showQrCode: boolean;
  isDoubleSided: boolean;
  fields: {
    bloodGroup: boolean;
    fatherName: boolean;
    phone: boolean;
    expiryDate: boolean;
  };
}

const DEFAULT_DATA: IDCardData = {
  name: "আব্দুর রহমান",
  studentId: "102030",
  class: "দশম শ্রেণী",
  section: "A",
  bloodGroup: "O+",
  phone: "01712-345678",
  fatherName: "কামাল উদ্দিন",
  expiryDate: "২০২৬-১২-৩১",
  instituteName: "মোবাইল হাজিরা হাই স্কুল",
  photoUrl: "https://picsum.photos/seed/student/200/200",
};

const DEFAULT_CONFIG: CardConfig = {
  primaryColor: "#6f42c1",
  secondaryColor: "#ffffff",
  frameStyle: "modern",
  showQrCode: true,
  isDoubleSided: false,
  fields: {
    bloodGroup: true,
    fatherName: true,
    phone: true,
    expiryDate: true,
  }
};

export default function IDCardGeneratorPage() {
  const [data, setData] = useState<IDCardData>(DEFAULT_DATA);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<"content" | "design" | "settings">("content");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate QR Code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(data.studentId || "000000", {
          margin: 1,
          width: 200,
          color: {
            dark: config.primaryColor,
            light: "#ffffff",
          },
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    generateQR();
  }, [data.studentId, config.primaryColor]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setData({ ...data, photoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const exportAsImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `id-card-${data.studentId || "student"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("ID কার্ড ডাউনলোড সফল হয়েছে!");
    } catch (err) {
      toast.error("ডাউনলোড করতে সমস্যা হয়েছে");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [85.6, 54], // Standard CR80 ID Card size in mm
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, 54, 85.6);
      pdf.save(`id-card-${data.studentId || "student"}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!");
    } catch (err) {
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-bengali">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
             </Link>
             <h1 className="text-xl font-black text-gray-900 flex items-center gap-3">
               <CreditCard className="w-6 h-6 text-[#6f42c1]" /> ID কার্ড জেনারেটর
             </h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={exportAsImage}
               disabled={isExporting}
               className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
             >
               <Download className="w-4 h-4" /> PNG
             </button>
             <button 
               onClick={exportAsPDF}
               disabled={isExporting}
               className="flex items-center gap-2 bg-[#6f42c1] text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-xl shadow-purple-200 hover:scale-105 active:scale-95 transition-all"
             >
               {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
               PDF ডাউনলোড
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Customizer Sidebar */}
          <div className="lg:col-span-5 space-y-6">
             <div className="bg-white rounded-[2rem] shadow-xl shadow-purple-500/5 border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                   {[
                     { id: "content", label: "তথ্য", icon: User },
                     { id: "design", label: "ডিজাইন", icon: Palette },
                     { id: "settings", label: "সেটিংস", icon: Settings2 }
                   ].map((tab) => (
                     <button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id as any)}
                       className={cn(
                         "flex-1 py-4 flex flex-col items-center gap-1 transition-all relative",
                         activeTab === tab.id ? "text-[#6f42c1]" : "text-gray-400"
                       )}
                     >
                       <tab.icon className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                       {activeTab === tab.id && (
                         <motion.div 
                           layoutId="activeTabID" 
                           className="absolute bottom-0 left-0 right-0 h-1 bg-[#6f42c1] rounded-t-full" 
                         />
                       )}
                     </button>
                   ))}
                </div>

                <div className="p-6">
                   <AnimatePresence mode="wait">
                      {activeTab === "content" && (
                        <motion.div 
                          key="content"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-4"
                        >
                           <div className="flex items-center gap-4 mb-6">
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer group hover:border-[#6f42c1] transition-all overflow-hidden relative"
                              >
                                {data.photoUrl ? (
                                  <img src={data.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <Camera className="w-6 h-6 text-gray-300 group-hover:text-[#6f42c1]" />
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                              </div>
                              <div>
                                 <p className="font-bold text-gray-800">শিক্ষার্থীর ছবি</p>
                                 <p className="text-xs text-gray-400">পিএনজি অথবা জেপিজি ফাইল সিলেক্ট করুন</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">শিক্ষার্থীর নাম</label>
                                 <input 
                                   type="text" 
                                   value={data.name} 
                                   onChange={e => setData({...data, name: e.target.value})}
                                   className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">রোল / আইডি</label>
                                 <input 
                                   type="text" 
                                   value={data.studentId} 
                                   onChange={e => setData({...data, studentId: e.target.value})}
                                   className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ক্লাস</label>
                                 <input 
                                   type="text" 
                                   value={data.class} 
                                   onChange={e => setData({...data, class: e.target.value})}
                                   className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">সেকশন</label>
                                 <input 
                                   type="text" 
                                   value={data.section} 
                                   onChange={e => setData({...data, section: e.target.value})}
                                   className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
                                 />
                              </div>
                           </div>

                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">প্রতিষ্ঠান</label>
                              <input 
                                type="text" 
                                value={data.instituteName} 
                                onChange={e => setData({...data, instituteName: e.target.value})}
                                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-2 border-transparent focus:border-[#6f42c1] outline-none"
                              />
                           </div>
                        </motion.div>
                      )}

                      {activeTab === "design" && (
                        <motion.div 
                          key="design"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">ফ্রেম স্টাইল</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                 {(['modern', 'classic', 'minimal', 'gradient', 'tech'] as const).map((style) => (
                                   <button
                                     key={style}
                                     onClick={() => setConfig({...config, frameStyle: style})}
                                     className={cn(
                                       "py-3 rounded-xl text-xs font-bold border-2 transition-all capitalize",
                                       config.frameStyle === style 
                                       ? "border-[#6f42c1] bg-purple-50 text-[#6f42c1]" 
                                       : "border-gray-100 text-gray-500 hover:border-gray-200"
                                     )}
                                   >
                                     {style}
                                   </button>
                                 ))}
                              </div>
                           </div>

                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">রঙ নির্বাচন</p>
                              <div className="flex gap-3">
                                 {['#6f42c1', '#1a73e8', '#00c853', '#d50000', '#212121', '#ffab00'].map((color) => (
                                   <button
                                     key={color}
                                     onClick={() => setConfig({...config, primaryColor: color})}
                                     style={{ backgroundColor: color }}
                                     className={cn(
                                       "w-10 h-10 rounded-full border-4 transition-all scale-100 hover:scale-110 flex items-center justify-center",
                                       config.primaryColor === color ? "border-white shadow-lg" : "border-transparent"
                                     )}
                                   >
                                     {config.primaryColor === color && <Check className="w-4 h-4 text-white" />}
                                   </button>
                                 ))}
                              </div>
                           </div>
                        </motion.div>
                      )}

                      {activeTab === "settings" && (
                        <motion.div 
                          key="settings"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-4"
                        >
                           <div className="space-y-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">তথ্য প্রদর্শন</p>
                              
                              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer">
                                 <span className="text-sm font-bold text-gray-700">QR কোড দেখান</span>
                                 <input 
                                   type="checkbox" 
                                   checked={config.showQrCode} 
                                   onChange={e => setConfig({...config, showQrCode: e.target.checked})}
                                   className="w-5 h-5 accent-[#6f42c1]"
                                 />
                              </label>

                              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer">
                                 <span className="text-sm font-bold text-gray-700">রক্তের গ্রুপ</span>
                                 <input 
                                   type="checkbox" 
                                   checked={config.fields.bloodGroup} 
                                   onChange={e => setConfig({
                                     ...config, 
                                     fields: { ...config.fields, bloodGroup: e.target.checked }
                                   })}
                                   className="w-5 h-5 accent-[#6f42c1]"
                                 />
                              </label>

                              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer">
                                 <span className="text-sm font-bold text-gray-700">পিতার নাম</span>
                                 <input 
                                   type="checkbox" 
                                   checked={config.fields.fatherName} 
                                   onChange={e => setConfig({
                                     ...config, 
                                     fields: { ...config.fields, fatherName: e.target.checked }
                                   })}
                                   className="w-5 h-5 accent-[#6f42c1]"
                                 />
                              </label>
                           </div>
                        </motion.div>
                      )}
                   </AnimatePresence>
                </div>
             </div>

             <Card className="p-6 bg-purple-50 border-purple-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 text-[#6f42c1]">
                   <CreditCard className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="font-bold text-purple-900">টিপস</h4>
                   <p className="text-sm text-purple-700/70 mt-1">সবচেয়ে ভালো রেজাল্টের সংযোগে শিক্ষার্থীদের রঙিন ছবি ব্যবহার করুন। ডাবল সাইড প্রিন্টের জন্য সেটিংস থেকে পরিবর্তন করতে পারেন।</p>
                </div>
             </Card>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-7 flex flex-col items-center">
             <div className="sticky top-24 w-full flex flex-col items-center">
                <div className="mb-4 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">লাইভ প্রিভিউ</span>
                </div>

                <div className="relative group perspective-1000">
                   <div 
                     id="id-card-preview"
                     ref={cardRef}
                     style={{ 
                       width: "300px", 
                       height: "480px", 
                       backgroundColor: "#ffffff",
                       boxShadow: "0 20px 50px rgba(0,0,0,0.1)"
                     }}
                     className={cn(
                       "rounded-3xl overflow-hidden relative select-none",
                       config.frameStyle === "modern" && "font-sans",
                       config.frameStyle === "tech" && "font-mono"
                     )}
                   >
                      {/* Frame Decorators Buffer */}
                      {config.frameStyle === "modern" && (
                        <>
                          <div style={{ backgroundColor: config.primaryColor }} className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-10" />
                          <div style={{ backgroundColor: config.primaryColor }} className="absolute top-0 w-full h-32" />
                          <div className="absolute top-32 w-full h-8 bg-white skew-y-3 -translate-y-4" />
                        </>
                      )}

                      {config.frameStyle === "classic" && (
                        <>
                          <div style={{ borderTop: `15px solid ${config.primaryColor}` }} className="absolute inset-0 border-x-[10px] border-b-[10px]" />
                        </>
                      )}

                      {config.frameStyle === "gradient" && (
                        <>
                          <div style={{ background: `linear-gradient(135deg, ${config.primaryColor}, #8a5ad4)` }} className="absolute inset-0 opacity-5" />
                          <div style={{ background: `linear-gradient(135deg, ${config.primaryColor}, #8a5ad4)` }} className="absolute top-0 w-full h-3" />
                          <div style={{ background: `linear-gradient(135deg, ${config.primaryColor}, #8a5ad4)` }} className="absolute bottom-0 w-full h-3" />
                        </>
                      )}

                      {config.frameStyle === "tech" && (
                        <>
                          <div style={{ borderColor: config.primaryColor }} className="absolute inset-4 border opacity-20" />
                          <div style={{ backgroundColor: config.primaryColor }} className="absolute top-0 right-0 w-20 h-20 rounded-bl-[100px] opacity-10" />
                        </>
                      )}

                      {/* Content Container */}
                      <div className="relative z-10 p-8 flex flex-col items-center h-full">
                         {/* Header */}
                         <div className="text-center mb-6">
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              config.frameStyle === "modern" ? "text-white" : "text-gray-400"
                            )}>
                              Student ID Card
                            </p>
                            <h2 className={cn(
                              "text-xs font-bold leading-tight mt-1",
                              config.frameStyle === "modern" ? "text-white" : "text-gray-900"
                            )}>
                              {data.instituteName || "INSTITUTE NAME"}
                            </h2>
                         </div>

                         {/* Photo */}
                         <div className="relative mb-6">
                            <div 
                              style={{ borderColor: config.primaryColor }} 
                              className={cn(
                                "w-28 h-28 rounded-full border-4 bg-gray-100 overflow-hidden shadow-lg",
                                config.frameStyle === "tech" && "rounded-2xl"
                              )}
                            >
                               <img 
                                 src={data.photoUrl || "https://avatar.iran.liara.run/public/boy"} 
                                 alt="Profile" 
                                 className="w-full h-full object-cover" 
                               />
                            </div>
                         </div>

                         {/* Name & ID */}
                         <div className="text-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 mb-1">{data.name || "Name"}</h3>
                            <div className="flex items-center justify-center gap-2">
                               <span style={{ backgroundColor: config.primaryColor }} className="px-2 py-0.5 text-[10px] font-bold text-white rounded">
                                 {data.studentId || "ID"}
                               </span>
                               <span className="text-xs text-gray-400 font-bold">{data.class} {data.section && `(${data.section})`}</span>
                            </div>
                         </div>

                         {/* Fields Grid */}
                         <div className="w-full space-y-3 mb-8">
                            {config.fields.fatherName && (
                              <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Father</span>
                                 <span className="text-xs font-bold text-gray-700">{data.fatherName}</span>
                              </div>
                            )}
                            {config.fields.bloodGroup && (
                              <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Blood Group</span>
                                 <span className="text-xs font-black text-rose-600">{data.bloodGroup}</span>
                              </div>
                            )}
                            {config.fields.phone && (
                              <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Phone</span>
                                 <span className="text-xs font-bold text-gray-700">{data.phone}</span>
                              </div>
                            )}
                            {config.fields.expiryDate && (
                              <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                                 <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Valid Till</span>
                                 <span className="text-xs font-bold text-gray-700">{data.expiryDate}</span>
                              </div>
                            )}
                         </div>

                         {/* Footer / QR */}
                         <div className="mt-auto flex flex-col items-center w-full">
                            {config.showQrCode && qrCodeUrl && (
                              <div className="w-20 h-20 bg-white p-1 rounded-xl border border-gray-100 shadow-sm mb-4">
                                 <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
                              </div>
                            )}
                            
                            <div className="text-[8px] text-gray-300 font-bold uppercase tracking-[0.2em] text-center">
                              Electronic Identity Verification System
                            </div>
                         </div>
                      </div>
                      
                      {/* Security Hologram */}
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500/20 via-blue-500/20 to-emerald-500/20 mix-blend-overlay animate-pulse" />
                   </div>
                </div>
                
                {/* Mobile helper */}
                <p className="mt-8 text-gray-400 text-xs flex items-center gap-2">
                   <Eye className="w-4 h-4" /> বাস্তব সাইজের প্রিন্টের জন্য PDF ডাউনলোড করুন
                </p>
             </div>
          </div>
        </div>
      </main>

      {/* Aesthetic Blobs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

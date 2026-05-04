"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  QrCode, 
  Hash, 
  ScanFace, 
  MapPin, 
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Camera,
  RefreshCw,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/src/hooks/useAuth";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/lib/firebase";
import { Html5Qrcode } from "html5-qrcode";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

// --- Types ---
interface AttendanceSession {
  id: string;
  classId: string;
  teacherId: string;
  teacherName?: string;
  method: string;
  code?: string;
  active: boolean;
  subject?: string;
  className?: string;
  section?: string;
  expiresAt?: any;
}

const QR_SCANNER_ID = "student-qr-scanner";

export default function StudentAttendancePage() {
  const { userData, loading: authLoading, tenant } = useAuth();
  const router = useRouter();
  
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendanceStep, setAttendanceStep] = useState<"list" | "marking" | "success">("list");
  
  // Method States
  const [inputCode, setInputCode] = useState(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Face Scan Mock
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Geo State
  const [isLocating, setIsLocating] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);

  // 1. Listen for active sessions
  useEffect(() => {
    if (!userData || !userData.tenant_id) return;

    const sessionsPath = `tenants/${userData.tenant_id}/attendance_sessions`;
    const q = query(
      collection(db, sessionsPath),
      where("active", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceSession[];
      
      // Filter sessions matching student's class
      // Note: In a real system, we'd use classId, but here we match by className string
      const studentClass = userData.class;
      const studentSection = userData.section;
      
      const filtered = sessions.filter(s => {
          // If the session record has className/section, match against those
          if (s.className && s.className !== studentClass) return false;
          if (s.section && s.section !== studentSection) return false;
          
          // Check expiry
          if (s.expiresAt) {
            const expires = s.expiresAt instanceof Timestamp ? s.expiresAt.toDate() : new Date(s.expiresAt);
            if (expires < new Date()) return false;
          }
          
          return true;
      });

      setActiveSessions(filtered);
      setLoadingSessions(false);
    }, (err) => {
      console.error("Session fetch error:", err);
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // QR Scanner Logic
  const startQRScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(QR_SCANNER_ID);
      scannerRef.current = html5QrCode;
      setScannerActive(true);

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleQRResult(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      toast.error("ক্যামেরা চালু করতে সমস্যা হয়েছে");
      setScannerActive(false);
    }
  };

  const stopQRScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setScannerActive(false);
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
    }
  };

  const handleQRResult = async (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.type === "attendance_code" && data.code) {
        await stopQRScanner();
        submitAttendance(data.code, "qr");
      } else {
        toast.error("ভুল QR কোড!");
      }
    } catch (e) {
      // If not JSON, maybe it's just the code string
      if (text.length === 2 && !isNaN(Number(text))) {
        await stopQRScanner();
        submitAttendance(text, "qr");
      } else {
        toast.error("অপরিচিত QR কোড");
      }
    }
  };

  // Code Logic
  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && isNaN(Number(value))) return;

    const newCode = [...inputCode];
    newCode[index] = value;
    setInputCode(newCode);

    if (value && index === 0) {
      const nextInput = document.getElementById("code-1");
      nextInput?.focus();
    }

    if (value && index === 1) {
       const finalCode = newCode.join("");
       submitAttendance(finalCode, "code");
    }
  };

  // Face Scan Mock Logic
  const startFaceScan = async () => {
    setIsFaceScanning(true);
    setFaceScanProgress(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      // Simulate scanning progress
      const interval = setInterval(() => {
        setFaceScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
               stream.getTracks().forEach(t => t.stop());
               submitAttendance("FACE_VERIFIED", "face_scan");
            }, 500);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    } catch (e) {
      toast.error("ক্যামেরা পারমিশন প্রয়োজন");
      setIsFaceScanning(false);
    }
  };

  // Geo Location Logic
  const verifyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("লোকেশন সাপোর্ট নেই");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // In a real app, we would compare with teacher's lat/lng
        // and check if distance < radius (e.g. 100m)
        setIsLocating(false);
        setLocationVerified(true);
        setTimeout(() => {
          submitAttendance("LOC_VERIFIED", "geo");
        }, 800);
      },
      (err) => {
        setIsLocating(false);
        toast.error("লোকেশন পাওয়া যায়নি। পারমিশন চেক করুন।");
      }
    );
  };

  // Main Submission
  const submitAttendance = async (code: string, method: string) => {
    if (!userData || !selectedSession) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: userData.tenant_id,
          classId: selectedSession.classId,
          code: code,
          attendance_method: method,
          presentStudents: [{
            id: userData.user_id,
            name: userData.name,
            roll: userData.student_id
          }]
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success("হাজিরা সফলভাবে জমা হয়েছে!");
        setAttendanceStep("success");
      } else {
        toast.error(data.error || "হাজিরা জমা হয়নি");
      }
    } catch (e) {
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6f42c1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => attendanceStep !== "list" ? setAttendanceStep("list") : router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-800 text-lg">ডিজিটাল হাজিরা</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] font-bold">
            {userData?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {attendanceStep === "list" && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Today's Context */}
              <Card className="p-5 border-none shadow-sm bg-gradient-to-br from-[#6f42c1] to-[#8a5ad4] text-white overflow-hidden relative">
                 <div className="relative z-10">
                    <p className="text-purple-100 text-xs font-mono tracking-widest uppercase mb-1">
                      {new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <h2 className="text-2xl font-bold mb-4">হাজিরা দিন</h2>
                    <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                       <Clock className="w-4 h-4" />
                       <span>ক্লাস হাজিরা এখন চলছে</span>
                    </div>
                 </div>
                 <QrCode className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 rotate-12" />
              </Card>

              {/* Active Sessions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="font-bold text-gray-700">চলমান সেশন</h3>
                   <button 
                     onClick={() => setLoadingSessions(true)}
                     className="text-xs text-[#6f42c1] font-medium flex items-center gap-1"
                   >
                     <RefreshCw className={cn("w-3 h-3", loadingSessions && "animate-spin")} />
                     রিফ্রেশ
                   </button>
                </div>

                {loadingSessions ? (
                   <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-300" />
                      <p className="text-gray-400 text-sm">সেশন খোঁজা হচ্ছে...</p>
                   </div>
                ) : activeSessions.length > 0 ? (
                  activeSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session);
                        setAttendanceStep("marking");
                      }}
                      className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-purple-300 hover:bg-purple-50/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-[#6f42c1]">
                            {session.method === "code" ? <Hash className="w-6 h-6" /> : 
                             session.method === "qr" ? <QrCode className="w-6 h-6" /> :
                             session.method === "face_scan" ? <ScanFace className="w-6 h-6" /> :
                             <MapPin className="w-6 h-6" />}
                         </div>
                         <div>
                            <span className="block font-bold text-gray-800">{session.subject || "সাধারণ পাঠ"}</span>
                            <span className="text-xs text-gray-500">{session.className} ({session.section}) • {session.teacherName || "শিক্ষক"}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl p-10 border border-dashed border-gray-200 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                       <Info className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">বর্তমানে কোনো সেশন নেই</p>
                    <p className="text-gray-400 text-xs mt-1">শিক্ষক হাজিরা শুরু করলে এখানে দেখা যাবে</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {attendanceStep === "marking" && selectedSession && (
            <motion.div 
               key="marking"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="space-y-6"
            >
               <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-purple-100">
                    <motion.div 
                      className="h-full bg-[#6f42c1]" 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 15 * 60, ease: "linear" }}
                    />
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mt-2">হাজিরা ভেরিফিকেশন</h3>
                  <p className="text-sm text-gray-500 mb-8">{selectedSession.subject}</p>

                  <div className="flex flex-col gap-6 items-center">
                    {/* Method Specific UI */}
                    {selectedSession.method === "code" && (
                      <div className="w-full space-y-6">
                         <p className="text-sm text-gray-600">শিক্ষকের দেওয়া <span className="font-bold text-[#6f42c1]">২ ডিজিটের কোডটি</span> লিখুন</p>
                         <div className="flex justify-center gap-4">
                            {[0, 1].map((i) => (
                              <input
                                key={i}
                                id={`code-${i}`}
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                value={inputCode[i]}
                                onChange={(e) => handleCodeInput(i, e.target.value)}
                                className="w-16 h-20 text-center text-3xl font-bold bg-gray-50 border-2 border-transparent focus:border-[#6f42c1] focus:bg-white rounded-2xl outline-none transition-all"
                                autoFocus={i === 0}
                              />
                            ))}
                         </div>
                      </div>
                    )}

                    {selectedSession.method === "qr" && (
                      <div className="w-full space-y-6">
                        <p className="text-sm text-gray-600">শিক্ষকের ডিভাইসে থাকা <span className="font-bold text-[#6f42c1]">হাজিরা QR কোড</span> স্ক্যান করুন</p>
                        
                        {!scannerActive ? (
                          <button 
                            onClick={startQRScanner}
                            className="w-full py-16 bg-purple-50 rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-purple-200 text-[#6f42c1]"
                          >
                            <Camera className="w-12 h-12" />
                            <span className="font-bold">ক্যামেরা চালু করুন</span>
                          </button>
                        ) : (
                          <div className="relative w-full aspect-square max-w-[280px] mx-auto overflow-hidden rounded-3xl border-4 border-[#6f42c1]">
                             <div id={QR_SCANNER_ID} className="w-full h-full overflow-hidden" />
                             <button 
                               onClick={stopQRScanner}
                               className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold"
                             >
                               বন্ধ করুন
                             </button>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedSession.method === "face_scan" && (
                      <div className="w-full space-y-6">
                        <p className="text-sm text-gray-600">আপনার মুখমণ্ডল ফ্রেমের ভেতরে রাখুন</p>
                        
                        <div className="relative w-full aspect-square max-w-[280px] mx-auto">
                           <div className="w-full h-full rounded-full border-4 border-[#6f42c1]/20 overflow-hidden relative flex items-center justify-center bg-gray-900">
                             {isFaceScanning ? (
                               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                             ) : (
                               <ScanFace className="w-24 h-24 text-white/20" />
                             )}
                             
                             {isFaceScanning && (
                               <div className="absolute inset-0 border-[10px] border-[#6f42c1] opacity-30 animate-pulse rounded-full" />
                             )}
                           </div>

                           {isFaceScanning && (
                             <div className="absolute -bottom-2 translate-y-full w-full">
                               <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-[#6f42c1]" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${faceScanProgress}%` }}
                                  />
                               </div>
                               <p className="text-[10px] text-gray-400 mt-2 font-mono uppercase tracking-widest">Scanning... {faceScanProgress}%</p>
                             </div>
                           )}
                        </div>

                        {!isFaceScanning && (
                          <button 
                            onClick={startFaceScan}
                            className="w-full mt-8 bg-[#6f42c1] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                          >
                            <ScanFace className="w-5 h-5" /> ফেস স্ক্যান শুরু করুন
                          </button>
                        )}
                      </div>
                    )}

                    {selectedSession.method === "geo" && (
                      <div className="w-full space-y-8 py-4">
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 relative">
                              <MapPin className={cn("w-12 h-12", isLocating && "animate-bounce")} />
                              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                           </div>
                           <div className="text-center">
                              <p className="font-bold text-gray-800">লোকেশন ভেরিফিকেশন</p>
                              <p className="text-xs text-gray-500 max-w-[200px] mx-auto mt-1">শিক্ষকের ১০০ মিটারের মধ্যে থাকলেই কেবল হাজিরা দিতে পারবেন</p>
                           </div>
                        </div>

                        <button 
                          onClick={verifyLocation}
                          disabled={isLocating || locationVerified}
                          className={cn(
                            "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                            locationVerified ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
                          )}
                        >
                          {isLocating ? (
                            <> <Loader2 className="w-5 h-5 animate-spin" /> অবস্থান চেক করা হচ্ছে... </>
                          ) : locationVerified ? (
                            <> <CheckCircle2 className="w-5 h-5" /> লোকেশন ভেরিফাইড </>
                          ) : (
                            <> অবস্থান যাচাই করুন </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                       <Loader2 className="w-10 h-10 animate-spin text-[#6f42c1]" />
                       <p className="font-bold text-[#6f42c1]">প্রসেস করা হচ্ছে...</p>
                    </div>
                  )}
               </div>

               <button 
                 onClick={() => setAttendanceStep("list")}
                 className="w-full py-4 text-gray-500 font-medium fle items-center justify-center gap-2"
               >
                 ফিরে যান
               </button>
            </motion.div>
          )}

          {attendanceStep === "success" && (
            <motion.div 
               key="success"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center py-12 space-y-6"
            >
               <div className="flex justify-center">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                     <CheckCircle2 className="w-16 h-16" />
                  </div>
               </div>
               
               <div>
                  <h2 className="text-2xl font-bold text-gray-800">অভিনন্দন!</h2>
                  <p className="text-gray-500 mt-2">আপনার হাজিরা সফলভাবে গ্রহণ করা হয়েছে।</p>
               </div>

               <Card className="p-4 bg-emerald-50 border-emerald-100 max-w-[280px] mx-auto text-left flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                     <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Status</p>
                    <p className="font-bold text-emerald-900">উপস্থিত (Present)</p>
                  </div>
               </Card>

               <button 
                 onClick={() => router.push("/student/dashboard")}
                 className="w-full bg-[#6f42c1] text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-200"
               >
                 ড্যাশবোর্ডে ফিরে যান
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background blobs for aesthetic */}
      <div className="fixed top-20 -left-20 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none" />
      <div className="fixed bottom-20 -right-20 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none" />
    </div>
  );
}

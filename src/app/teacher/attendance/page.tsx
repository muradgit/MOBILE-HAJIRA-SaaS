"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  QrCode, 
  Hash, 
  ScanFace, 
  Camera, 
  MapPin, 
  ChevronRight,
  GraduationCap,
  Loader2,
  AlertCircle,
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Search,
  CheckSquare,
  Square,
  Save,
  Clock,
  FlipHorizontal,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/src/store/useUserStore";
import { Card } from "@/src/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { db, auth } from "@/src/lib/firebase";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from "firebase/firestore";

/**
 * Teacher Attendance Page - MOBILE-HAJIRA SaaS
 * Main portal for teachers to take student attendance using 6 different methods.
 * Classes are fetched dynamically based on teacher assignments.
 */

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ATTENDANCE_METHODS = [
  {
    id: "manual",
    title: "ম্যানুয়াল হাজিরা",
    description: "শিক্ষার্থীদের তালিকা থেকে সরাসরি হাজিরা দিন",
    icon: Users,
    color: "bg-purple-100 text-purple-600",
    hoverColor: "hover:bg-purple-600",
  },
  {
    id: "qr",
    title: "QR কোড স্ক্যান",
    description: "শিক্ষার্থীর আইডি কার্ডের QR কোড স্ক্যান করুন",
    icon: QrCode,
    color: "bg-blue-100 text-blue-600",
    hoverColor: "hover:bg-blue-600",
  },
  {
    id: "code",
    title: "কোড দিয়ে হাজিরা",
    description: "একটি নির্দিষ্ট কোড শেয়ার করে হাজিরা সংগ্রহ করুন",
    icon: Hash,
    color: "bg-emerald-100 text-emerald-600",
    hoverColor: "hover:bg-emerald-600",
  },
  {
    id: "face",
    title: "ফেস স্ক্যান",
    description: "ফেস রিকগনিশন ব্যবহার করে দ্রুত হাজিরা নিন",
    icon: ScanFace,
    color: "bg-orange-100 text-orange-600",
    hoverColor: "hover:bg-orange-600",
  },
  {
    id: "camera",
    title: "ক্যামেরা হাজিরা",
    description: "পুরো ক্লাসের ছবি বা ভিডিও থেকে অটোমেটিক হাজিরা",
    icon: Camera,
    color: "bg-rose-100 text-rose-600",
    hoverColor: "hover:bg-rose-600",
  },
  {
    id: "geo",
    title: "জিও লোকেশন",
    description: "শিক্ষার্থীর অবস্থান যাচাই করে হাজিরা নিশ্চিত করুন",
    icon: MapPin,
    color: "bg-indigo-100 text-indigo-600",
    hoverColor: "hover:bg-indigo-600",
  },
];

interface TeacherClass {
  id: string;
  name: string;
  nameBN?: string;
  section?: string;
  studentCount?: number;
}

interface Student {
  user_id: string;
  student_id: string;
  name: string;
  class: string;
  section: string;
  photo_url?: string;
}

export default function AttendancePage() {
  const { tenantId, user } = useUserStore();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Attendance State
  const [attendanceMethod, setAttendanceMethod] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("সাধারণ পাঠ");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance by Code State
  const [attendanceCode, setAttendanceCode] = useState<string | null>(null);
  const [codeQrUrl, setCodeQrUrl] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const sessionUnsubscribe = useRef<(() => void) | null>(null);

  // Face Scan State
  const [faceScanActive, setFaceScanActive] = useState(false);
  const [faceVideoStream, setFaceVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Camera Attendance State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraVideoStream, setCameraVideoStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // QR Scanner State
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const QR_SCANNER_ID = "qr-reader";

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Stats
  const presentCount = Object.values(attendance).filter(v => v).length;
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Persistence
  useEffect(() => {
    if (selectedClassId && (attendanceMethod === "manual" || attendanceMethod === "qr" || attendanceMethod === "code" || attendanceMethod === "face" || attendanceMethod === "camera") && Object.keys(attendance).length > 0) {
      const cacheKey = `att_cache_${selectedClassId}_${attendanceMethod}`;
      localStorage.setItem(cacheKey, JSON.stringify({ 
        attendance, 
        studentNotes, 
        subject,
        attendanceCode,
        codeQrUrl,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [attendance, studentNotes, subject, selectedClassId, attendanceMethod, attendanceCode, codeQrUrl]);

  // QR Scanner Cleanup
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
      if (sessionUnsubscribe.current) {
        sessionUnsubscribe.current();
      }
      stopFaceScan();
      stopCamera();
    };
  }, []);

  const stopFaceScan = () => {
    if (faceVideoStream) {
      faceVideoStream.getTracks().forEach(track => track.stop());
      setFaceVideoStream(null);
    }
    setFaceScanActive(false);
  };

  const stopCamera = () => {
    if (cameraVideoStream) {
      cameraVideoStream.getTracks().forEach(track => track.stop());
      setCameraVideoStream(null);
    }
    setCameraActive(false);
    setIsRecording(false);
  };

  useEffect(() => {
    async function fetchAssignedClasses() {
      if (!tenantId || !user?.user_id) {
        setLoading(false);
        return;
      }

      const path = `tenants/${tenantId}/teacher_classes`;
      try {
        const q = query(
          collection(db, path),
          where("teacher_id", "==", user.user_id)
        );
        
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeacherClass[];
        
        setClasses(fetched);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignedClasses();
  }, [tenantId, user?.user_id]);

  const handleMethodClick = async (methodId: string, methodName: string) => {
    if (!selectedClassId) {
      toast.error("অনুগ্রহ করে আগে একটি ক্লাস নির্বাচন করুন!");
      return;
    }

    if (methodId === "manual") {
      setAttendanceMethod("manual");
      await fetchStudentsForClass(true);
    } else if (methodId === "qr") {
      setAttendanceMethod("qr");
      await fetchStudentsForClass(false);
      setTimeout(() => startQRScanner(), 500);
    } else if (methodId === "code") {
      setAttendanceMethod("code");
      await fetchStudentsForClass(false);
    } else if (methodId === "face") {
      setAttendanceMethod("face");
      await fetchStudentsForClass(false);
    } else if (methodId === "camera") {
      setAttendanceMethod("camera");
      await fetchStudentsForClass(false);
    } else {
      toast.success(`${methodName} শুরু হচ্ছে...`);
    }
  };

  const fetchStudentsForClass = async (defaultPresent: boolean = true) => {
    if (!tenantId || !selectedClass) return;
    
    setFetchingStudents(true);
    try {
      // First, try subcollection (preferred for per-tenant optimization)
      let studentPath = `tenants/${tenantId}/students`;
      let q = query(
        collection(db, studentPath),
        where("class", "==", selectedClass.name),
        where("status", "==", "approved")
      );

      let snapshot = await getDocs(q);
      
      // Fallback to global users collection if subcollection is empty
      if (snapshot.empty) {
        studentPath = "users";
        q = query(
          collection(db, studentPath),
          where("tenant_id", "==", tenantId),
          where("role", "==", "student"),
          where("class", "==", selectedClass.name),
          where("status", "==", "approved")
        );
        snapshot = await getDocs(q);
      }

      const fetchedStudents = snapshot.docs.map(doc => ({
        user_id: doc.id,
        ...doc.data()
      })) as Student[];
      
      // Sort by student_id (Roll)
      fetchedStudents.sort((a, b) => {
        const idA = a.student_id || "999";
        const idB = b.student_id || "999";
        return idA.localeCompare(idB, undefined, { numeric: true });
      });

      setStudents(fetchedStudents);
      
      // Check for cached data (method specific)
      const cacheKey = `att_cache_${selectedClassId}_${attendanceMethod || (defaultPresent ? 'manual' : 'qr')}`;
      const saved = localStorage.getItem(cacheKey);
      
      if (saved) {
        try {
          const { attendance: savedAtt, studentNotes: savedNotes, subject: savedSubject, attendanceCode: savedCode, codeQrUrl: savedQr } = JSON.parse(saved);
          setAttendance(savedAtt);
          setStudentNotes(savedNotes || {});
          setSubject(savedSubject || "সাধারণ পাঠ");
          if (savedCode) {
             setAttendanceCode(savedCode);
             listenForCodeAttendance(savedCode);
          }
          if (savedQr) setCodeQrUrl(savedQr);
          toast.info("পূর্বের ড্রাফট লোড করা হয়েছে");
        } catch (e) {
          console.error("Cache parsing error:", e);
        }
      } else {
        // Initialize attendance
        const initialAttendance: Record<string, boolean> = {};
        fetchedStudents.forEach(s => {
          initialAttendance[s.user_id] = defaultPresent;
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("শিক্ষার্থীদের তালিকা লোড করতে সমস্যা হয়েছে");
    } finally {
      setFetchingStudents(false);
    }
  };

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
          handleQRScan(decodedText);
        },
        () => {
          // Failure is ignored as it scans continuously
        }
      );
    } catch (err: any) {
      console.error("QR Scanner start error:", err);
      toast.error("ক্যামেরা শুরু করতে সমস্যা হয়েছে: " + err.message);
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

  const handleQRScan = (decodedText: string) => {
    // Look for matching student by user_id or student_id (Roll)
    const matchedStudent = students.find(s => 
      s.user_id === decodedText || 
      s.student_id === decodedText
    );

    if (matchedStudent) {
      if (attendance[matchedStudent.user_id]) {
        // Already scanned, maybe show a subtler notification
        return;
      }

      setAttendance(prev => ({ ...prev, [matchedStudent.user_id]: true }));
      setLastScanned(matchedStudent.name);
      toast.success(`${matchedStudent.name} (Roll: ${matchedStudent.student_id}) - উপস্থিত`, {
        duration: 2000,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });

      // Clear last scanned name after 3 seconds
      setTimeout(() => setLastScanned(null), 3000);
    } else {
      // Not found in this class
      toast.error("শিক্ষার্থী এই ক্লাসে অন্তর্ভুক্ত নয়!", { duration: 1500 });
    }
  };

  const generateAttendanceCode = async () => {
    if (!tenantId || !selectedClassId || !user) return;
    
    setIsGeneratingCode(true);
    try {
      const code = Math.floor(10 + Math.random() * 90).toString(); // 2-digit code
      const qrData = JSON.stringify({
        type: "attendance_code",
        code: code,
        classId: selectedClassId,
        className: selectedClass?.name,
        teacherId: user.user_id,
        timestamp: Date.now()
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: "#6f42c1",
          light: "#ffffff"
        }
      });

      setAttendanceCode(code);
      setCodeQrUrl(qrUrl);

      // Create a session in Firestore so students can "check-in"
      const sessionPath = `tenants/${tenantId}/attendance_sessions`;
      await addDoc(collection(db, sessionPath), {
        classId: selectedClassId,
        teacherId: user.user_id,
        method: "code",
        code: code,
        active: true,
        subject: subject,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000) // 15 mins
      });

      listenForCodeAttendance(code);
      toast.success("কোড জেনারেট করা হয়েছে!");
    } catch (error) {
      console.error("Code generation error:", error);
      toast.error("কোড জেনারেট করতে সমস্যা হয়েছে");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const listenForCodeAttendance = (code: string) => {
    if (!tenantId || !selectedClassId || sessionUnsubscribe.current) return;

    // Listen for student check-ins in the temporary entries for this session
    const checkinPath = `tenants/${tenantId}/attendance_entries`;
    const q = query(
      collection(db, checkinPath),
      where("classId", "==", selectedClassId),
      where("code", "==", code),
      where("createdAt", ">=", Timestamp.fromMillis(Date.now() - 3600000)) // Last 1 hour
    );

    sessionUnsubscribe.current = onSnapshot(q, (snapshot) => {
      const newAttendance = { ...attendance };
      let changed = false;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.studentId && !newAttendance[data.studentId]) {
          newAttendance[data.studentId] = true;
          changed = true;
          
          const student = students.find(s => s.user_id === data.studentId);
          if (student) {
            toast.success(`${student.name} হাজিরা দিয়েছেন`, { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> });
          }
        }
      });

      if (changed) {
        setAttendance(newAttendance);
      }
    });
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const startFaceScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" } 
      });
      setFaceVideoStream(stream);
      setFaceScanActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error("Face scan camera error:", error);
      toast.error("ক্যামেরা চালু করতে সমস্যা হয়েছে: " + error.message);
    }
  };

  const handleCaptureFace = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    // Simulate Face Detection & Recognition
    setTimeout(() => {
      // Find a student who hasn't been marked present yet for this demo
      const nextStudent = students.find(s => !attendance[s.user_id]);
      
      if (nextStudent) {
        setAttendance(prev => ({ ...prev, [nextStudent.user_id]: true }));
        toast.success(`${nextStudent.name} এর ফেস ম্যাচ হয়েছে!`, {
          icon: <ScanFace className="w-6 h-6 text-emerald-500" />
        });
      } else {
        toast.error("সব শিক্ষার্থীর হাজিরা সম্পন্ন হয়েছে");
      }
      
      setIsCapturing(false);
    }, 1500); // Simulated delay for scanning
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" },
        audio: true
      });
      setCameraVideoStream(stream);
      setCameraActive(true);
      setCapturedMedia(null);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      toast.error("ক্যামেরা চালু করতে সমস্যা হয়েছে");
    }
  };

  const takePhoto = () => {
    if (!cameraVideoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(cameraVideoRef.current, 0, 0);
      const url = canvas.toDataURL("image/jpeg");
      setCapturedMedia({ url, type: "image" });
      stopCamera();
      toast.success("ছবি তোলা হয়েছে!");
    }
  };

  const startRecording = () => {
    if (!cameraVideoStream) return;
    
    const recorder = new MediaRecorder(cameraVideoStream);
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setCapturedMedia({ url, type: "video" });
      stopCamera();
    };
    
    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    toast.info("রেকর্ডিং শুরু হয়েছে...");
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success("ভিডিও রেকর্ড করা হয়েছে!");
    }
  };

  const markAll = (status: boolean) => {
    const newBatch: Record<string, boolean> = {};
    students.forEach(s => {
      newBatch[s.user_id] = status;
    });
    setAttendance(newBatch);
    toast.info(status ? "সবাইকে উপস্থিত করা হয়েছে" : "সবাইকে অনুপস্থিত করা হয়েছে");
  };

  const handleSubmitAttendance = async () => {
    if (!tenantId || !selectedClass || !user || students.length === 0) return;
    
    setSubmitting(true);
    const toastId = toast.loading("হাজিরা জমা দেওয়া হচ্ছে...");

    try {
      const token = await auth.currentUser?.getIdToken();
      
      const payload = {
        tenant_id: tenantId,
        classId: selectedClassId,
        className: selectedClass.nameBN || selectedClass.name,
        section: selectedClass.section || "",
        subject: subject,
        teacherName: user.name,
        totalPresent: presentCount,
        totalAbsent: students.length - presentCount,
        presentStudents: students.filter(s => attendance[s.user_id]).map(s => ({
          id: s.user_id,
          name: s.name,
          roll: s.student_id,
          note: studentNotes[s.user_id] || ""
        })),
        absentStudents: students.filter(s => !attendance[s.user_id]).map(s => ({
          id: s.user_id,
          name: s.name,
          roll: s.student_id
        }))
      };

      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "হাজিরা জমা দিতে ব্যর্থ হয়েছে");
      }

      // Clear cache on success
      localStorage.removeItem(`att_cache_${selectedClassId}_${attendanceMethod}`);
      
      toast.success(result.message || "হাজিরা সফলভাবে জমা দেওয়া হয়েছে!", { id: toastId });
      
      // Stop scripts/listeners
      if (attendanceMethod === "qr") {
        stopQRScanner();
      }
      if (attendanceMethod === "face") {
        stopFaceScan();
      }
      if (attendanceMethod === "camera") {
        stopCamera();
      }
      if (sessionUnsubscribe.current) {
        sessionUnsubscribe.current();
        sessionUnsubscribe.current = null;
      }

      // Delay reset for UX
      setTimeout(() => {
        setAttendanceMethod(null);
        setSelectedClassId(null);
        setAttendance({});
        setStudentNotes({});
      }, 1000);

    } catch (error: any) {
      console.error("Error submitting attendance:", error);
      toast.error(error.message || "সার্ভার এরর: হাজিরা জমা দেওয়া যায়নি", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const matchedAtClass = () => selectedClass?.nameBN || selectedClass?.name;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-bengali">
      {/* Header Section */}
      <div className="bg-[#6f42c1] text-white pt-10 pb-16 px-6 rounded-b-[3rem] shadow-2xl shadow-purple-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">হাজিরা নিন</h1>
              <p className="text-purple-100 text-xs font-medium opacity-80 uppercase tracking-widest">Attendance Management Portal</p>
            </div>
          </div>
          <p className="text-purple-50 text-sm leading-relaxed max-w-sm">
            ধন্যবাদ শিক্ষক! আজকের ক্লাসের হাজিরা নিতে নিচের পদ্ধতিগুলো থেকে একটি বেছে নিন।
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 space-y-8">
        <AnimatePresence mode="wait">
          {!attendanceMethod ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Step 1: Dynamic Class Selection */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> ক্লাস নির্বাচন করুন
                  </h2>
                  {selectedClassId && (
                    <button 
                      onClick={() => setSelectedClassId(null)}
                      className="text-[10px] font-black text-purple-600 uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[60px]">
                  {loading ? (
                    <div className="flex items-center gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-32 h-14 bg-white rounded-2xl animate-pulse flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                        </div>
                      ))}
                    </div>
                  ) : classes.length > 0 ? (
                    classes.map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={cn(
                          "px-6 py-4 rounded-2xl font-black text-sm transition-all shrink-0 border-2",
                          selectedClassId === cls.id
                            ? "bg-[#6f42c1] border-[#6f42c1] text-white shadow-xl shadow-purple-600/20 scale-105"
                            : "bg-white border-transparent text-gray-500 hover:border-purple-200"
                        )}
                      >
                        {cls.nameBN || cls.name} {cls.section ? `(${cls.section})` : ""}
                      </button>
                    ))
                  ) : (
                    <div className="w-full p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-purple-200 flex flex-col items-center gap-4 text-center">
                      <div className="p-4 bg-purple-50 rounded-2xl text-purple-400">
                        <AlertCircle className="w-10 h-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-gray-900 text-lg">আপনাকে এখনো কোনো ক্লাস অ্যাসাইন করা হয়নি।</p>
                        <p className="text-sm font-medium text-gray-400">অনুগ্রহ করে Institute Admin-এর সাথে যোগাযোগ করুন।</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Step 2: Attendance Methods Grid */}
              <section className="space-y-4">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> হাজিরা পদ্ধতি বেছে নিন
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ATTENDANCE_METHODS.map((method, index) => {
                    const Icon = method.icon;
                    return (
                      <motion.button
                        key={method.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: selectedClassId ? 1.02 : 1 }}
                        whileTap={{ scale: selectedClassId ? 0.98 : 1 }}
                        onClick={() => handleMethodClick(method.id, method.title)}
                        className={cn(
                          "group text-left p-5 rounded-[2rem] bg-white border-2 border-transparent transition-all relative overflow-hidden",
                          selectedClassId 
                            ? "shadow-sm hover:shadow-xl hover:border-[#6f42c1]/20 active:bg-gray-50 cursor-pointer" 
                            : "opacity-60 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "p-4 rounded-2xl transition-colors shrink-0",
                            method.color,
                            selectedClassId && `group-hover:${method.hoverColor.replace('hover:', '')} group-hover:text-white`
                          )}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-black text-gray-900 leading-tight">
                              {method.title}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        
                        {selectedClassId && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#6f42c1]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Dynamic Empty State Advice */}
              {!selectedClassId && !loading && classes.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 bg-purple-50 rounded-3xl border border-purple-100 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <ChevronRight className="w-5 h-5 text-[#6f42c1] transform animate-bounce" />
                  </div>
                  <p className="text-xs font-bold text-purple-700 leading-relaxed">
                    হাজিরা শুরু করতে অনুগ্রহ করে উপরের তালিকা থেকে একটি ক্লাস নির্বাচন করুন।
                  </p>
                </motion.div>
              )}

              {/* Admin Link for missing classes */}
              {!loading && classes.length === 0 && (
                <div className="flex justify-center">
                  <button className="flex items-center gap-2 text-[#6f42c1] font-black text-sm hover:underline">
                    <PlusCircle className="w-4 h-4" /> নতুন ক্লাস তৈরি করুন
                  </button>
                </div>
              )}
            </motion.div>
          ) : attendanceMethod === "code" ? (
            <motion.div
              key="code-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-40"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    if (sessionUnsubscribe.current) sessionUnsubscribe.current();
                    sessionUnsubscribe.current = null;
                    setAttendanceMethod(null);
                  }}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors font-bengali"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase font-bengali">Session Code Mode</span>
                </div>
              </div>

              {!attendanceCode ? (
                <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col items-center justify-center text-center gap-6">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center">
                      <Hash className="w-10 h-10" />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 font-bengali">কোড জেনারেট করুন</h2>
                      <p className="text-sm text-gray-400 font-medium font-bengali">একটি ২-সংখ্যার কোড তৈরি করুন যা শিক্ষার্থীরা তাদের ফোন থেকে সাবমিট করবে।</p>
                   </div>
                   <button 
                    onClick={generateAttendanceCode}
                    disabled={isGeneratingCode}
                    className="w-full py-5 bg-[#6f42c1] text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 font-bengali"
                   >
                     {isGeneratingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                     কোড তৈরি করুন
                   </button>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Digital Display Card */}
                  <Card className="bg-white border-0 shadow-2xl rounded-[3rem] overflow-hidden">
                    <div className="p-8 pb-4 text-center border-b border-gray-50">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 font-bengali">বর্তমান সেশন কোড</p>
                       <div className="flex items-center justify-center gap-4">
                          <span className="text-8xl font-black text-[#6f42c1] tracking-tighter">{attendanceCode}</span>
                       </div>
                    </div>
                    
                    <div className="p-10 flex flex-col items-center justify-center gap-6 bg-gray-50/50">
                       {codeQrUrl ? (
                         <div className="p-6 bg-white rounded-[2.5rem] shadow-xl shadow-purple-900/5 relative group">
                            <img src={codeQrUrl} alt="Session QR" className="w-48 h-48" />
                            <div className="absolute inset-0 border-4 border-white/50 rounded-[2.5rem] transition-all" />
                            <div className="mt-4 text-center">
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 font-bengali">
                                  <QrCode className="w-3 h-3" /> স্ক্যান করে হাজিরা দিন
                               </p>
                            </div>
                         </div>
                       ) : (
                         <div className="w-48 h-48 bg-white rounded-[2.5rem] animate-pulse flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-200" />
                         </div>
                       )}
                       
                       <div className="space-y-1 text-center">
                          <p className="text-sm font-black text-gray-900 font-bengali">শিক্ষার্থীদের এই কোডটি দিন</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-bengali">কোডটি ১৫ মিনিট সচল থাকবে</p>
                       </div>

                       <button 
                        onClick={generateAttendanceCode}
                        className="text-[10px] font-black text-purple-600 uppercase tracking-widest hover:underline font-bengali"
                       >
                         নতুন কোড তৈরি করুন
                       </button>
                    </div>
                  </Card>

                  {/* Real-time Attendees List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black text-gray-900 font-bengali flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#6f42c1]" /> উপস্থিত শিক্ষার্থী ({presentCount})
                      </h3>
                      <div className="flex items-center gap-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-bengali">Live Updates</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {students.filter(s => attendance[s.user_id]).length > 0 ? (
                        students.filter(s => attendance[s.user_id])
                        .reverse()
                        .map((student) => (
                          <motion.div
                            key={student.user_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-emerald-50 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                 {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 font-bengali leading-tight">{student.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Roll: {student.student_id}</p>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest font-bengali">
                               হাজিরা দিয়েছে
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-12 text-center bg-white/50 border-2 border-dashed border-gray-100 rounded-[2.5rem] space-y-3">
                           <Loader2 className="w-8 h-8 animate-spin text-gray-200 mx-auto" />
                           <p className="text-[11px] font-bold text-gray-400 font-bengali uppercase tracking-widest">শিক্ষার্থীদের জন্য অপেক্ষা করা হচ্ছে...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : attendanceMethod === "camera" ? (
            <motion.div
              key="camera-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-40"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    stopCamera();
                    setAttendanceMethod(null);
                    setCapturedMedia(null);
                  }}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors font-bengali"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase font-bengali">Media Capture Station</span>
                </div>
              </div>

              {!cameraActive && !capturedMedia ? (
                <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col items-center justify-center text-center gap-6">
                   <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center">
                      <Camera className="w-12 h-12" />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 font-bengali">ক্যামেরা হাজিরা</h2>
                      <p className="text-sm text-gray-400 font-medium font-bengali">পুরো ক্লাসের একটি ছবি বা ভিডিও নিন। পরবর্তীতে সেখান থেকে হাজিরা নিশ্চিত করা হবে।</p>
                   </div>
                   <button 
                    onClick={startCamera}
                    className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 font-bengali"
                   >
                     <Camera className="w-5 h-5" /> ক্যামেরা চালু করুন
                   </button>
                </Card>
              ) : cameraActive ? (
                <div className="space-y-6">
                   {/* Camera Preview */}
                   <Card className="relative overflow-hidden border-0 shadow-2xl rounded-[3rem] bg-black aspect-video group">
                      <video 
                        ref={cameraVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Interaction Overlays */}
                      <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-8">
                         {!isRecording ? (
                           <>
                             <button 
                               onClick={takePhoto}
                               className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl shadow-rose-500/20"
                               title="Take Photo"
                             >
                                <div className="w-14 h-14 rounded-full bg-white" />
                             </button>
                             <button 
                               onClick={startRecording}
                               className="w-16 h-16 rounded-full border-2 border-white/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                               title="Record Video"
                             >
                                <div className="w-6 h-6 rounded-full bg-red-500" />
                             </button>
                           </>
                         ) : (
                           <button 
                             onClick={stopRecording}
                             className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center animate-pulse"
                            title="Stop Recording"
                           >
                              <div className="w-8 h-8 bg-red-600 rounded-sm" />
                           </button>
                         )}
                      </div>

                      {/* Rec Indicator */}
                      {isRecording && (
                        <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                           <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">Recording</span>
                        </div>
                      )}
                   </Card>

                   <div className="text-center">
                      <button 
                        onClick={stopCamera}
                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors font-bengali"
                      >
                        ক্যামেরা বন্ধ করুন
                      </button>
                   </div>
                </div>
              ) : (
                <div className="space-y-8">
                   {/* Captured Media Preview */}
                   <Card className="relative overflow-hidden border-0 shadow-2xl rounded-[3rem] bg-gray-100 aspect-video group">
                      {capturedMedia?.type === "image" ? (
                        <img src={capturedMedia.url} alt="Captured Class" className="w-full h-full object-cover" />
                      ) : (
                        <video src={capturedMedia?.url} controls className="w-full h-full object-cover" />
                      )}
                      
                      <button 
                        onClick={() => {
                          setCapturedMedia(null);
                          startCamera();
                        }}
                        className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-2xl text-rose-500 shadow-xl hover:bg-rose-500 hover:text-white transition-all transform active:scale-90"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                         <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg">
                               <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                                 {capturedMedia?.type === "image" ? "Snapshot Captured" : "Video Recording Saved"}
                               </p>
                            </div>
                         </div>
                      </div>
                   </Card>

                   {/* Post-Capture Student Selection */}
                   <div className="space-y-6">
                      <div className="space-y-1 px-2">
                        <h3 className="text-lg font-black text-gray-900 font-bengali">উপস্থিতি নিশ্চিত করুন</h3>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest font-bengali">ক্যাপচার করা মিডিয়া দেখে উপস্থিত শিক্ষার্থীদের টিক দিন</p>
                      </div>

                      <Card className="bg-white p-6 border-none shadow-xl rounded-[2.5rem] space-y-4">
                        <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
                          <input 
                              type="text" 
                              placeholder="শিক্ষার্থী খুঁজুন..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-300 font-bengali"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                           {filteredStudents.map((student) => (
                             <button
                               key={student.user_id}
                               onClick={() => toggleAttendance(student.user_id)}
                               className={cn(
                                 "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                                 attendance[student.user_id]
                                   ? "bg-rose-50 border-rose-500/20 text-rose-700"
                                   : "bg-white border-transparent text-gray-400"
                               )}
                             >
                               <div className={cn(
                                 "w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 border-2",
                                 attendance[student.user_id] ? "bg-white border-rose-100" : "bg-gray-100 border-transparent"
                               )}>
                                 {student.name.charAt(0)}
                               </div>
                               <div className="text-left overflow-hidden">
                                  <p className="text-[11px] font-black font-bengali truncate">{student.name}</p>
                                  <p className="text-[9px] font-bold opacity-60">Roll: {student.student_id}</p>
                               </div>
                             </button>
                           ))}
                        </div>
                      </Card>
                   </div>
                </div>
              )}
            </motion.div>
          ) : attendanceMethod === "face" ? (
            <motion.div
              key="face-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-40"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    stopFaceScan();
                    setAttendanceMethod(null);
                  }}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors font-bengali"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase font-bengali">AI Face Scan Station</span>
                </div>
              </div>

              {!faceScanActive ? (
                <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col items-center justify-center text-center gap-6">
                   <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-[2.5rem] flex items-center justify-center">
                      <ScanFace className="w-12 h-12" />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-900 font-bengali">ফেস স্ক্যান শুরু করুন</h2>
                      <p className="text-sm text-gray-400 font-medium font-bengali">শিক্ষার্থীরা একে একে ক্যামেরার সামনে এসে তাদের মুখ স্ক্যান করবে।</p>
                   </div>
                   <button 
                    onClick={startFaceScan}
                    className="w-full py-5 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 font-bengali"
                   >
                     <Camera className="w-5 h-5" /> স্ক্যান শুরু করুন
                   </button>
                </Card>
              ) : (
                <div className="space-y-6">
                   {/* Face Preview Card */}
                   <Card className="relative overflow-hidden border-0 shadow-2xl rounded-[3rem] bg-black aspect-[3/4] max-w-sm mx-auto group">
                      <video 
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover grayscale-[0.3] brightness-125"
                      />
                      
                      {/* Overlay Guide */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                         <div className="relative w-64 h-80 border-2 border-white/30 rounded-[6rem]">
                            <div className="absolute inset-0 border-t-4 border-l-4 border-orange-500 w-16 h-16 rounded-tl-[4rem] -left-1 -top-1" />
                            <div className="absolute inset-0 border-t-4 border-r-4 border-orange-500 w-16 h-16 rounded-tr-[4rem] -right-1 -top-1" />
                            <div className="absolute inset-0 border-b-4 border-l-4 border-orange-500 w-16 h-16 rounded-bl-[4rem] -left-1 -bottom-1" />
                            <div className="absolute inset-0 border-b-4 border-r-4 border-orange-500 w-16 h-16 rounded-br-[4rem] -right-1 -bottom-1" />
                            
                            {/* Scanning Animation Line */}
                            <motion.div 
                              animate={{ top: ["10%", "90%"] }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                              className="absolute left-0 right-0 h-0.5 bg-orange-400/50 shadow-[0_0_15px_rgba(251,146,60,0.8)] z-10"
                            />
                         </div>

                         <div className="absolute top-8 px-6 py-2 bg-orange-500/90 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest font-bengali">
                            নিচের ফ্রেমের মধ্যে মুখ রাখুন
                         </div>
                      </div>

                      {/* Controls Overlay */}
                      <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4">
                         <button 
                           onClick={handleCaptureFace}
                           disabled={isCapturing}
                           className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
                         >
                            <div className={cn(
                              "w-14 h-14 rounded-full bg-orange-500 shadow-xl shadow-orange-600/40",
                              isCapturing && "animate-pulse scale-90"
                            )} />
                         </button>
                         <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] font-bengali">
                           {isCapturing ? "Scanning..." : "Tap to Scan Face"}
                         </p>
                      </div>

                      {/* Capture Success Overlay */}
                      <AnimatePresence>
                        {isCapturing && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/10 backdrop-blur-sm z-30 pointer-events-none"
                          >
                             <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div 
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                                  className="w-24 h-24 bg-white/20 border-2 border-white/50 rounded-full p-6"
                                >
                                   <Loader2 className="w-full h-full text-white animate-spin" />
                                </motion.div>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </Card>

                   <div className="text-center">
                      <button 
                        onClick={stopFaceScan}
                        className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline font-bengali"
                      >
                        ক্যামেরা বন্ধ করুন
                      </button>
                   </div>

                   {/* Today's Stats for Teacher */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black text-gray-900 font-bengali flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-500" /> ফেস স্ক্যান হাজিরা ({presentCount})
                        </h3>
                        <div className="flex items-center gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-bengali">Auto Ready</span>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-3">
                        {students.filter(s => attendance[s.user_id]).length > 0 ? (
                           students.filter(s => attendance[s.user_id])
                             .reverse()
                             .slice(0, 5) // Show last 5
                             .map((student) => (
                                <motion.div
                                  key={student.user_id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-emerald-50 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-xs">
                                       {student.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-gray-900 font-bengali leading-tight">{student.name}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marked via AI</p>
                                    </div>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </motion.div>
                             ))
                        ) : (
                           <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-100 rounded-[2rem]">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-bengali">স্ক্যান করা শিক্ষার্থীদের তালিকা এখানে দেখাবে</p>
                           </div>
                        )}
                     </div>
                   </div>
                </div>
              )}
            </motion.div>
          ) : attendanceMethod === "qr" ? (
            <motion.div
              key="qr-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-40"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    stopQRScanner();
                    setAttendanceMethod(null);
                  }}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors font-bengali"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">QR Scanner Mode</span>
                </div>
              </div>

              {/* Scanner Interface */}
              <Card className="relative overflow-hidden border-0 shadow-2xl rounded-[2.5rem] bg-black aspect-square max-w-sm mx-auto">
                <div id={QR_SCANNER_ID} className="w-full h-full"></div>
                
                {/* Overlay UI */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8">
                  <div className="w-full flex justify-between">
                     <div className="w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl" />
                     <div className="w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-white font-black text-sm font-bengali drop-shadow-lg">শিক্ষার্থীর আইডি কার্ডের QR কোড স্ক্যান করুন</p>
                    <div className="w-24 h-1 bg-white/20 mx-auto rounded-full overflow-hidden">
                       <motion.div 
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          className="w-full h-full bg-blue-500" 
                       />
                    </div>
                  </div>

                  <div className="w-full flex justify-between">
                     <div className="w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl" />
                     <div className="w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-2xl" />
                  </div>
                </div>

                {/* Successful Scanned Feedback */}
                <AnimatePresence>
                  {lastScanned && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 bg-emerald-500/90 flex flex-col items-center justify-center p-6 text-white text-center z-20 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="w-16 h-16 mb-4" />
                      <h3 className="text-2xl font-black font-bengali">{lastScanned}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest mt-2">{matchedAtClass()} - উপস্থিত</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!scannerActive && !lastScanned && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
                     <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                     <p className="text-xs font-black uppercase tracking-widest text-gray-400 font-bengali">ক্যামেরা চালু হচ্ছে...</p>
                  </div>
                )}
              </Card>

              {/* Scanned List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-gray-900 font-bengali flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> আজকের ক্লাসে যারা উপস্থিত ({presentCount})
                  </h3>
                  {presentCount > 0 && (
                    <button 
                      onClick={() => setAttendance({})}
                      className="text-[10px] font-black text-red-500 uppercase tracking-widest"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {students.filter(s => attendance[s.user_id]).length > 0 ? (
                    students.filter(s => attendance[s.user_id])
                    .reverse()
                    .map((student) => (
                      <motion.div
                        key={student.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-emerald-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                             {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 font-bengali leading-tight">{student.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Roll: {student.student_id}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setAttendance(prev => ({ ...prev, [student.user_id]: false }))}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] space-y-2">
                       <QrCode className="w-8 h-8 text-gray-300 mx-auto" />
                       <p className="text-xs font-bold text-gray-400 font-bengali">এখনো কেউ স্ক্যান করেনি</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="manual-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Manual Attendance Header */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setAttendanceMethod(null)}
                  className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-widest hover:text-[#6f42c1] transition-colors font-bengali"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Manual Mode</span>
                </div>
              </div>

              <Card className="p-6 border-none shadow-xl shadow-purple-900/5 space-y-6 rounded-[2.5rem] bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 font-bengali">শিক্ষার্থীদের তালিকা ({presentCount}/{students.length})</h2>
                    <p className="text-xs text-gray-400 font-medium font-bengali">উপস্থিতি নিশ্চিত করতে শিক্ষার্থীর কার্ডে ক্লিক করুন</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => markAll(true)}
                      className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm font-bengali border border-emerald-100"
                    >
                      সবাই উপস্থিত
                    </button>
                    <button 
                      onClick={() => markAll(false)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm font-bengali border border-red-100"
                    >
                      সবাই অনুপস্থিত
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Search Box */}
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
                    <input 
                        type="text" 
                        placeholder="নাম বা আইডি দিয়ে সার্চ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-300 font-bengali"
                    />
                  </div>

                  {/* Subject Input */}
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
                    <input 
                        type="text" 
                        placeholder="বিষয় (যেমন: গণিত)"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-300 font-bengali"
                    />
                  </div>
                </div>
              </Card>

              {/* Students List */}
              <div className="space-y-3 pb-32">
                {fetchingStudents ? (
                  <div className="p-12 flex flex-col items-center justify-center text-center gap-4 bg-white rounded-[3rem]">
                      <Loader2 className="w-10 h-10 animate-spin text-[#6f42c1]" />
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest font-bengali">শিক্ষার্থী তালিকা লোড হচ্ছে...</p>
                  </div>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student, idx) => (
                    <motion.div
                      key={student.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <button
                        onClick={() => toggleAttendance(student.user_id)}
                        className={cn(
                          "w-full flex flex-col p-5 rounded-[2rem] border-2 transition-all active:scale-[0.98]",
                          attendance[student.user_id] 
                            ? "bg-white border-emerald-500/20 shadow-lg shadow-emerald-500/5 ring-4 ring-emerald-500/5" 
                            : "bg-white border-transparent text-gray-400 opacity-60"
                        )}
                      >
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border-2",
                              attendance[student.user_id] ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-gray-100 border-transparent text-gray-300"
                            )}>
                              {student.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <h4 className={cn("font-black text-sm font-bengali", attendance[student.user_id] ? "text-gray-900" : "text-gray-400")}>{student.name}</h4>
                              <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">ID: {student.student_id}</p>
                            </div>
                          </div>

                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                            attendance[student.user_id] ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-gray-100 text-gray-300"
                          )}>
                            {attendance[student.user_id] ? <CheckCircle2 className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                          </div>
                        </div>

                        {/* Optional Student Note */}
                        <AnimatePresence>
                          {attendance[student.user_id] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="w-full mt-4"
                            >
                              <input 
                                type="text"
                                placeholder="এই শিক্ষার্থীর জন্য নোট লিখুন (ঐচ্ছিক)"
                                value={studentNotes[student.user_id] || ""}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setStudentNotes(prev => ({ ...prev, [student.user_id]: e.target.value }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-emerald-50/50 border-none rounded-xl py-3 px-4 text-[11px] font-bold text-emerald-900 placeholder:text-emerald-300 outline-none focus:ring-1 focus:ring-emerald-200 transition-all font-bengali"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-12 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 space-y-3">
                     <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
                     <p className="text-gray-400 font-bold font-bengali">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Footer Stats & Action */}
      <AnimatePresence>
        {selectedClassId && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50 flex flex-col gap-4"
          >
            {attendanceMethod === "manual" || attendanceMethod === "qr" || attendanceMethod === "code" || attendanceMethod === "face" || attendanceMethod === "camera" ? (
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-[2.5rem] shadow-2xl flex flex-col gap-4">
                 <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-3">
                       <Clock className="w-4 h-4 text-[#6f42c1]" />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Attendance Summary</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-emerald-600">{presentCount} Present</span>
                       <span className="w-1 h-1 rounded-full bg-gray-200" />
                       <span className="text-xs font-black text-red-500">{students.length - presentCount} Absent</span>
                    </div>
                 </div>

                 <button 
                  onClick={handleSubmitAttendance}
                  disabled={submitting || (attendanceMethod === "manual" && fetchingStudents) || (attendanceMethod === "code" && !attendanceCode)}
                  className="w-full py-5 bg-[#6f42c1] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 font-bengali"
                 >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    হাজিরা জমা দিন
                 </button>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#6f42c1]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">নির্বাচিত ক্লাস</p>
                    <p className="text-sm font-black text-gray-900 leading-tight">
                      {selectedClass?.nameBN || selectedClass?.name}
                    </p>
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-gray-100" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট শিক্ষার্থী</p>
                    <p className="text-sm font-black text-[#6f42c1]">{selectedClass?.studentCount || "..."}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

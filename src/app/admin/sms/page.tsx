"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useUserStore } from "@/src/store/useUserStore";
import { db } from "@/src/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  orderBy, 
  addDoc, 
  updateDoc, 
  increment,
  getDocs,
  limit
} from "firebase/firestore";
import { 
  MessageSquare, 
  Send, 
  History, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert, 
  Zap, 
  Users, 
  Calendar,
  CheckCircle2,
  Trash2,
  Info
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { Card } from "@/src/components/ui/Card";

interface SMSLog {
  id?: string;
  tenant_id: string;
  type: "Manual" | "Attendance";
  message: string;
  recipient_count: number;
  cost: number;
  created_at: string;
  status: "sent" | "failed";
}

/**
 * Institute Admin - SMS Management Dashboard
 * Step 4.6: SMS Panel & Credit System
 */
export default function SMSManagementPage() {
  const { userData, loading: authLoading } = useAuth();
  const { tenantId: storeTenantId } = useUserStore();
  
  const [activeTab, setActiveTab] = useState<"manual" | "attendance" | "history">("manual");
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [history, setHistory] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Manual SMS State
  const [manualClass, setManualClass] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [manualMessage, setManualMessage] = useState("");

  // Attendance SMS State
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkingAbsentees, setCheckingAbsentees] = useState(false);
  const [absenteeCount, setAbsenteeCount] = useState<number | null>(null);

  // 1. Resolve Tenant
  useEffect(() => {
    if (storeTenantId) setActiveTenantId(storeTenantId);
    else if (userData?.tenant_id) setActiveTenantId(userData.tenant_id);
  }, [storeTenantId, userData]);

  // 2. Real-time Listeners (Credits & History)
  useEffect(() => {
    if (!activeTenantId) return;

    setLoading(true);

    // Sync Tenant Credits
    const unsubTenant = onSnapshot(doc(db, "tenants", activeTenantId), (snap) => {
      if (snap.exists()) {
        setCredits(snap.data().credits_left || 0);
      }
    });

    // Sync SMS History
    const q = query(
      collection(db, "sms_history"),
      where("tenant_id", "==", activeTenantId),
      orderBy("created_at", "desc"),
      limit(50)
    );

    const unsubHistory = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SMSLog)));
      setLoading(false);
    }, (err) => {
      console.error("SMS History Err:", err);
      setLoading(false);
    });

    return () => {
      unsubTenant();
      unsubHistory();
    };
  }, [activeTenantId]);

  // 3. Send Manual SMS
  const handleSendManualSMS = async () => {
    if (!manualMessage.trim()) return toast.error("মেসেজ বডি খালি রাখা যাবে না");
    if (!manualClass) return toast.error("একটি ক্লাস সিলেক্ট করুন");
    
    // Mocking recipient count for demo (In real app, fetch users by class)
    const mockRecipientCount = 45; 
    const cost = mockRecipientCount * 1; // 1 Credit per SMS

    if (credits < cost) return toast.error("পর্যাপ্ত ক্রেডিট নেই, রিচার্জ করুন।");

    const confirm = window.confirm(`${mockRecipientCount} জন শিক্ষার্থীকে মেসজটি পাঠাতে ${cost} ক্রেডিট খরচ হবে। আপনি কি নিশ্চিত?`);
    if (!confirm) return;

    setSending(true);
    const toastId = toast.loading("SMS পাঠানো হচ্ছে...");

    try {
      // Simulate API Delay
      await new Promise(r => setTimeout(r, 2000));

      // Update Credits
      await updateDoc(doc(db, "tenants", activeTenantId!), {
        credits_left: increment(-cost)
      });

      // Log to History
      await addDoc(collection(db, "sms_history"), {
        tenant_id: activeTenantId,
        type: "Manual",
        message: manualMessage,
        recipient_count: mockRecipientCount,
        cost: cost,
        created_at: new Date().toISOString(),
        status: "sent"
      });

      toast.success(`সফলভাবে ${mockRecipientCount} টি SMS পাঠানো হয়েছে`, { id: toastId });
      setManualMessage("");
    } catch (err: any) {
      toast.error("SMS ব্যর্থ হয়েছে: " + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  // 4. Attendance Checker (Mock)
  const handleCheckAbsentees = async () => {
    if (!attendanceClass) return toast.error("ক্লাস সিলেক্ট করুন");
    setCheckingAbsentees(true);
    await new Promise(r => setTimeout(r, 1200));
    setAbsenteeCount(5); // Mocked
    setCheckingAbsentees(false);
  };

  // 5. Send Attendance Alert
  const handleSendAttendanceAlert = async () => {
    if (absenteeCount === null || absenteeCount === 0) return toast.error("কোন অনুপস্থিত শিক্ষার্থী পাওয়া যায়নি");
    
    const cost = absenteeCount * 1;
    if (credits < cost) return toast.error("পর্যাপ্ত ক্রেডিট নেই, রিচার্জ করুন।");

    setSending(true);
    const toastId = toast.loading("অভিভাবকদের SMS পাঠানো হচ্ছে...");

    try {
      await new Promise(r => setTimeout(r, 2000));

      await updateDoc(doc(db, "tenants", activeTenantId!), {
        credits_left: increment(-cost)
      });

      await addDoc(collection(db, "sms_history"), {
        tenant_id: activeTenantId,
        type: "Attendance",
        message: `আজকের অনুপস্থিতি এলার্ট - ${absenteeCount} জন`,
        recipient_count: absenteeCount,
        cost: cost,
        created_at: new Date().toISOString(),
        status: "sent"
      });

      toast.success("অভিভাবকদের সফলভাবে অবয় করা হয়েছে", { id: toastId });
      setAbsenteeCount(null);
    } catch (err: any) {
      toast.error("ব্যর্থ হয়েছে: " + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  // Auth/Role Protection
  const isAuthorized = userData?.role === "InstitutionAdmin" || userData?.role === "SuperAdmin";

  if (authLoading || (loading && !credits && activeTenantId)) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-black text-red-500 font-bengali">অ্যাক্সেস ডিনাইড</h2>
        <p className="text-gray-500 max-w-xs font-bengali">শুধুমাত্র ইনস্টিটিউট এডমিন এই প্যানেলটি ব্যবহার করতে পারবেন।</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 p-2">
      
      {/* Top Header & Credits */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-200">
             <MessageSquare className="w-7 h-7 text-white" />
           </div>
           <div>
             <h1 className="text-2xl font-black text-gray-900 font-bengali tracking-tight">SMS ম্যানেজমেন্ট</h1>
             <p className="text-sm text-gray-500 font-medium font-bengali">প্রতিষ্ঠান থেকে সরাসরি SMS পাঠান এবং রিপোর্ট দেখুন</p>
           </div>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 px-8 rounded-3xl text-white shadow-xl flex items-center gap-6">
           <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
             <Zap className="w-5 h-5" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">অবশিষ্ট SMS ক্রেডিট</p>
              <h2 className="text-2xl font-black">{credits}</h2>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-3xl w-full sm:w-fit font-bengali">
        <button 
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex-1 sm:flex-none px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "manual" ? "bg-white text-purple-600 shadow-md" : "text-gray-500"
          )}
        >
          <Send className="w-4 h-4" /> ম্যানুয়াল SMS
        </button>
        <button 
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "flex-1 sm:flex-none px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "attendance" ? "bg-white text-purple-600 shadow-md" : "text-gray-500"
          )}
        >
          <Users className="w-4 h-4" /> হাজিরা SMS
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 sm:flex-none px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
            activeTab === "history" ? "bg-white text-purple-600 shadow-md" : "text-gray-500"
          )}
        >
          <History className="w-4 h-4" /> SMS হিস্টোরি
        </button>
      </div>

      {/* Manual SMS Tab */}
      {activeTab === "manual" && (
        <Card className="p-8 space-y-6 border-transparent shadow-2xl shadow-purple-500/5 rounded-[3rem]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">সিলেক্ট ক্লাস</label>
              <select 
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              >
                <option value="">ক্লাস সিলেক্ট করুন</option>
                <option value="6">Class 6</option>
                <option value="7">Class 7</option>
                <option value="8">Class 8</option>
                <option value="9">Class 9</option>
                <option value="10">Class 10</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">বিভাগ (ঐচ্ছিক)</label>
              <select 
                value={manualDept}
                onChange={(e) => setManualDept(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              >
                <option value="">সকল বিভাগ</option>
                <option value="Science">বিজ্ঞান</option>
                <option value="Arts">মানবিক</option>
                <option value="Commerce">ব্যবসায় শিক্ষা</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between items-center px-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">মেসেজ বডি</label>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  manualMessage.length > 160 ? "text-red-500" : "text-gray-400"
                )}>
                  {manualMessage.length}/160 ক্যারেক্টার
                </span>
             </div>
             <textarea 
               rows={5}
               value={manualMessage}
               onChange={(e) => setManualMessage(e.target.value)}
               placeholder="এখানে আপনার মেসেজটি লিখুন..."
               className="w-full bg-gray-50 border-none rounded-3xl px-6 py-6 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-medium leading-relaxed"
             />
          </div>

          <button 
            disabled={sending}
            onClick={handleSendManualSMS}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-100 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all font-bengali"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            SMS পাঠান
          </button>
        </Card>
      )}

      {/* Attendance SMS Tab */}
      {activeTab === "attendance" && (
        <Card className="p-8 space-y-8 border-transparent shadow-2xl shadow-purple-500/5 rounded-[3rem]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">সিলেক্ট ক্লাস</label>
              <select 
                value={attendanceClass}
                onChange={(e) => setAttendanceClass(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 transition-all font-bengali text-sm font-bold"
              >
                <option value="">ক্লাস সিলেক্ট করুন</option>
                <option value="6">Class 6</option>
                <option value="7">Class 7</option>
                <option value="10">Class 10</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">তারিখ</label>
              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 outline-none focus:ring-2 focus:ring-purple-600 transition-all text-sm font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50 gap-4">
            {absenteeCount === null ? (
               <>
                 <AlertTriangle className="w-12 h-12 text-amber-200" />
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest">প্রথমে অনুপস্থিত শিক্ষার্থী ডাটা চেক করুন</p>
                 <button 
                   disabled={checkingAbsentees}
                   onClick={handleCheckAbsentees}
                   className="bg-purple-100 text-purple-600 px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 font-bengali"
                 >
                   {checkingAbsentees ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                   অনুপস্থিত চেক করুন
                 </button>
               </>
            ) : (
               <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 font-bengali">অনুপস্থিত শিক্ষার্থী: {absenteeCount} জন</h3>
                    <p className="text-xs font-medium text-gray-400 font-bengali mt-1">অভিভাবকদের অটোমেটিক SMS পাঠানোর জন্য নিচের বাটনে ক্লিক করুন।</p>
                  </div>
                  <button 
                    disabled={sending}
                    onClick={handleSendAttendanceAlert}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-100 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all font-bengali"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    অভিভাবকদের SMS পাঠান
                  </button>
                  <button 
                    onClick={() => setAbsenteeCount(null)}
                    className="text-[10px] font-black uppercase text-gray-400 tracking-widest hover:text-red-500 transition-colors"
                  >
                    Reset Check
                  </button>
               </div>
            )}
          </div>
        </Card>
      )}

      {/* SMS History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
           {history.length > 0 ? (
             history.map((log) => (
               <Card key={log.id} className="p-6 border-transparent shadow-sm hover:shadow-xl transition-all rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-6 group overflow-hidden relative">
                  <div className={cn(
                    "absolute top-0 left-0 w-1.5 h-full",
                    log.type === "Manual" ? "bg-purple-600" : "bg-emerald-500"
                  )} />
                  
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                     <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        log.type === "Manual" ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"
                     )}>
                        {log.type === "Manual" ? <MessageSquare className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                     </div>
                     <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                           <h4 className="text-sm font-black text-gray-900 font-bengali truncate">{log.message}</h4>
                           <span className="shrink-0 scale-75 lg:scale-100 px-2 py-0.5 rounded-lg bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           <span>Date: {new Date(log.created_at).toLocaleDateString()}</span>
                           <span>Recipients: {log.recipient_count}</span>
                           <span className="text-purple-600">Cost: {log.cost} Credits</span>
                        </div>
                     </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                     <div className="text-right">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Status</p>
                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">DELIVERED</span>
                     </div>
                     <button className="p-3 bg-gray-50 text-gray-200 rounded-xl group-hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
               </Card>
             ))
           ) : (
             <div className="py-32 text-center bg-white rounded-[3rem] border border-gray-50 shadow-sm space-y-4">
                <History className="w-16 h-16 text-gray-100 mx-auto" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] font-bengali">এখনো কোনো মেসজ পাঠানো হয়নি</p>
             </div>
           )}
        </div>
      )}

      {/* Info Warning */}
      <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl flex items-start gap-4">
         <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
         <div className="space-y-1">
           <p className="text-xs font-black text-blue-600 uppercase tracking-widest font-bengali">SMS পলিসি:</p>
           <p className="text-[11px] font-medium text-blue-500/80 leading-relaxed font-bengali">প্রতিটি SMS এর জন্য ১ ক্রেডিট কাটা হবে। অটোমেটিক হাজিরা SMS এর মাধ্যমে অভিভাবকরা শিক্ষার্থীর অনুপস্থিতি সম্পর্কে সাথে সাথে জানতে পারবেন। SMS গেটওয়ে বর্তমানে একটি টেস্ট মোডে আছে।</p>
         </div>
      </div>
    </div>
  );
}

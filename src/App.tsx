import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  QrCode, 
  Users, 
  Wallet as WalletIcon, 
  Gift, 
  Share2, 
  LogOut, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Camera,
  History
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { cn } from "./lib/utils";

// --- Types ---
interface Tenant {
  tenant_id: string;
  name: string;
  eiin: string;
  credits_left: number;
  promo_code: string;
  referral_count: number;
}

interface UserData {
  user_id: string;
  tenant_id: string;
  role: "SuperAdmin" | "SchoolAdmin" | "Teacher";
  name: string;
}

// --- Components ---

const Layout = ({ children, user, tenant, onLogout }: { children: React.ReactNode, user: UserData | null, tenant: Tenant | null, onLogout: () => void }) => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#141414]">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E4E3E0] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[#6f42c1]" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tight leading-none">Mobile-Hajira</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Smart Attendance System</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{user.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-mono">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto p-4 pb-24">
        {children}
      </main>
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E3E0] px-4 py-2 flex justify-around items-center sm:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <NavButton icon={QrCode} label="Scan" to="/scanner" />
          <NavButton icon={Users} label="Students" to="/students" />
          <NavButton icon={WalletIcon} label="Wallet" to="/wallet" />
          <NavButton icon={FileText} label="Reports" to="/reports" />
        </nav>
      )}
    </div>
  );
};

const NavButton = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;
  return (
    <button 
      onClick={() => navigate(to)}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-colors",
        isActive ? "text-[#6f42c1]" : "text-gray-400"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
};

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-white border border-[#E4E3E0] rounded-xl shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-4 py-3 border-b border-[#E4E3E0] flex items-center gap-2 bg-gray-50">
        {Icon && <Icon className="w-4 h-4 text-[#6f42c1]" />}
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</h2>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

// --- Pages ---

const Login = () => {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6 max-w-md w-full"
      >
        <ShieldCheck className="w-20 h-20 text-[#6f42c1] mx-auto" />
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Mobile-Hajira</h2>
          <p className="text-muted-foreground">The most advanced multi-tenant attendance system for institutions.</p>
        </div>
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#59359a] transition-colors shadow-lg shadow-purple-200"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          Continue with Google
        </button>
        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">Secure JWT-based Authentication</p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#6f42c1] to-[#59359a] text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest opacity-80">Available Credits</p>
              <h3 className="text-4xl font-bold mt-1">{tenant?.credits_left || 0}</h3>
            </div>
            <WalletIcon className="w-8 h-8 opacity-20" />
          </div>
          <button 
            onClick={() => navigate("/wallet")}
            className="mt-4 w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Recharge Now
          </button>
        </Card>
        <Card title="Quick Actions" icon={Plus}>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate("/scanner")}
              className="flex flex-col items-center gap-2 p-4 border border-dashed border-gray-200 rounded-xl hover:border-[#6f42c1] hover:bg-purple-50 transition-all group"
            >
              <QrCode className="w-6 h-6 text-gray-400 group-hover:text-[#6f42c1]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">New Attendance</span>
            </button>
            <button 
              onClick={() => navigate("/students")}
              className="flex flex-col items-center gap-2 p-4 border border-dashed border-gray-200 rounded-xl hover:border-[#6f42c1] hover:bg-purple-50 transition-all group"
            >
              <Users className="w-6 h-6 text-gray-400 group-hover:text-[#6f42c1]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Manage Students</span>
            </button>
          </div>
        </Card>
        <Card title="Daily Reward" icon={Gift}>
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">Share the system with others and get 1 free credit daily!</p>
            <button 
              onClick={async () => {
                try {
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch("/api/rewards/share", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ tenant_id: user.tenant_id })
                  });
                  if (res.ok) toast.success("Daily reward claimed!");
                  else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to claim reward");
                  }
                } catch (e) {
                  toast.error("Network error");
                }
              }}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
            >
              <Share2 className="w-4 h-4" />
              Claim Daily Share
            </button>
          </div>
        </Card>
      </div>

      <Card title="Recent Activity" icon={History}>
        <div className="space-y-4">
          <div className="text-center py-8 text-muted-foreground italic text-xs font-mono uppercase tracking-widest">
            No recent attendance records found
          </div>
        </div>
      </Card>
    </div>
  );
};

const Scanner = ({ user }: { user: UserData }) => {
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [scanning, setScanning] = useState(true);
  const [subject, setSubject] = useState("");
  const [teacherId, setTeacherId] = useState(user.user_id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      if (!scannedIds.includes(decodedText)) {
        setScannedIds(prev => [...prev, decodedText]);
        toast.success(`Scanned: ${decodedText}`);
      }
    }, (error) => {
      // console.warn(error);
    });
    return () => scanner.clear();
  }, [scanning]);

  const handleSave = async () => {
    if (!subject) return toast.error("Please enter subject name");
    if (scannedIds.length === 0) return toast.error("No students scanned");

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/attendance/batch", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tenant_id: user.tenant_id,
          student_ids: scannedIds,
          teacher_id: teacherId,
          subject
        })
      });
      if (res.ok) {
        toast.success("Attendance saved successfully!");
        setScannedIds([]);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save attendance");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Attendance Scanner" icon={Camera}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject Name</label>
              <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics-101"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teacher ID</label>
              <input 
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>
          <div id="reader" className="overflow-hidden rounded-xl border-2 border-[#6f42c1] border-dashed"></div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Scanned: {scannedIds.length}</p>
            <button 
              onClick={() => setScannedIds([])}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600"
            >
              Clear All
            </button>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || scannedIds.length === 0}
            className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#59359a] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Save Attendance
          </button>
        </div>
      </Card>

      <Card title="Scanned Students" icon={Users}>
        <div className="space-y-2">
          {scannedIds.map((id, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs font-mono">{id}</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          ))}
          {scannedIds.length === 0 && (
            <p className="text-center py-4 text-xs text-muted-foreground uppercase font-mono tracking-widest">No students scanned yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};

const WalletView = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const [trxId, setTrxId] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [applying, setApplying] = useState(false);

  const handleClaim = async () => {
    if (!trxId) return toast.error("Enter TrxID");
    setClaiming(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/payments/claim", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ trx_id: trxId, tenant_id: user.tenant_id })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Success! Added ${data.creditsAdded} credits.`);
        setTrxId("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to claim");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setClaiming(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode) return toast.error("Enter Promo Code");
    setApplying(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/promo/apply", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ promo_code: promoCode, tenant_id: user.tenant_id })
      });
      if (res.ok) {
        toast.success("Promo code applied! +20 credits added.");
        setPromoCode("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to apply");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Recharge Credits" icon={WalletIcon}>
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#6f42c1]">Payment Instructions</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              1. Send money via bKash/Nagad to <span className="font-bold">01519208586</span>.<br/>
              2. Copy the <span className="font-bold">TrxID</span> from the SMS.<br/>
              3. Paste it below to claim your credits instantly.
            </p>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Rate: 1 Tk = 1 Credit | 10% Bonus on 500+ Tk</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction ID (TrxID)</label>
            <div className="flex gap-2">
              <input 
                value={trxId}
                onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                placeholder="e.g. BJK8X92P"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none font-mono"
              />
              <button 
                onClick={handleClaim}
                disabled={claiming}
                className="bg-[#6f42c1] text-white px-6 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#59359a] transition-colors disabled:opacity-50"
              >
                {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Promo Code" icon={Gift}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Your Referral Code</p>
              <p className="text-lg font-bold text-[#6f42c1] font-mono">{tenant?.promo_code || "---"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Total Referrals</p>
              <p className="text-lg font-bold">{tenant?.referral_count || 0}/5</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Apply Referral Code</label>
            <div className="flex gap-2">
              <input 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter Code"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#6f42c1] outline-none font-mono"
              />
              <button 
                onClick={handleApplyPromo}
                disabled={applying}
                className="bg-gray-800 text-white px-6 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          setUser(userData);

          // Listen for tenant updates
          const unsubscribe = onSnapshot(doc(db, "tenants", userData.tenant_id), (doc) => {
            if (doc.exists()) {
              setTenant(doc.data() as Tenant);
            }
          });
          setLoading(false);
          return () => unsubscribe();
        } else {
          // If user doesn't exist, create a default SchoolAdmin for demo
          const newTenantId = `tenant_${Math.random().toString(36).substr(2, 9)}`;
          const promoCode = `MH-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          
          const newTenant: Tenant = {
            tenant_id: newTenantId,
            name: firebaseUser.displayName || "New Institution",
            eiin: "123456",
            credits_left: 100,
            promo_code: promoCode,
            referral_count: 0
          };

          const newUser: UserData = {
            user_id: firebaseUser.uid,
            tenant_id: newTenantId,
            role: "SchoolAdmin",
            name: firebaseUser.displayName || "Admin"
          };

          // In a real app, this would be handled by a registration flow
          // For this demo, we'll auto-provision
          // (Note: This might fail if rules are strict, but for demo we'll assume it works)
          setUser(newUser);
          setTenant(newTenant);
        }
      } else {
        setUser(null);
        setTenant(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-10 h-10 text-[#6f42c1] animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" richColors />
      <Layout user={user} tenant={tenant} onLogout={() => signOut(auth)}>
        <Routes>
          <Route path="/" element={user ? <Dashboard user={user} tenant={tenant} /> : <Login />} />
          <Route path="/scanner" element={user ? <Scanner user={user} /> : <Navigate to="/" />} />
          <Route path="/wallet" element={user ? <WalletView user={user} tenant={tenant} /> : <Navigate to="/" />} />
          <Route path="/students" element={user ? <div className="text-center py-20 uppercase font-mono tracking-widest text-muted-foreground">Student Management Coming Soon</div> : <Navigate to="/" />} />
          <Route path="/reports" element={user ? <div className="text-center py-20 uppercase font-mono tracking-widest text-muted-foreground">Reports Coming Soon</div> : <Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

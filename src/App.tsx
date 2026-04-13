"use client";

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, increment, setDoc, deleteDoc, getDocFromServer, orderBy, limit } from "firebase/firestore";
import { Toaster, toast } from "sonner";

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
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
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Firestore Error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}
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
  History,
  Database,
  LogIn,
  UserPlus,
  ChevronRight,
  Home,
  User,
  Mail,
  Phone,
  BookOpen,
  ClipboardList,
  Menu,
  X,
  ChevronDown,
  LifeBuoy,
  Settings,
  Filter
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
  status?: "active" | "suspended" | "deactivated";
  plan?: "Free Tier" | "Paid";
  class_duration?: number;
  total_credit_used?: number;
  total_credit_purchased?: number;
  last_reward_date?: string;
  promo_code_claimed?: boolean;
  recharge_status?: string;
  last_recharge_date?: string;
  referral_link?: string;
  website?: string;
  phone?: string;
  attendance_app_link?: string;
  attendance_app_pin?: string;
  owner_email?: string;
  admin_name?: string;
  admin_mobile?: string;
  last_active_date?: string;
  teachers_amount?: number;
  students_amount?: number;
  institutionType?: "College" | "School" | "Madrasa" | "Coaching Center";
  departmentName?: string;
}

interface UserData {
  user_id: string;
  tenant_id: string;
  role: "SuperAdmin" | "InstitutionAdmin" | "Teacher" | "Student";
  name: string;
  email?: string;
  phone?: string;
  student_id?: string;
  teacher_id?: string;
  class?: string;
  section?: string;
  subject?: string;
  profile_image?: string;
  created_at?: string;
  status?: "pending" | "approved";
}

interface Course {
  course_id: string;
  tenant_id: string;
  name: string;
  code: string;
  teacher_id: string;
}

interface AttendanceRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  teacher_id: string;
  subject: string;
  timestamp: string;
  status: "present" | "absent";
}

interface Transaction {
  trx_id: string;
  amount: number;
  sender_number: string;
  status: "unused" | "used";
  claimed_by_tenant: string;
  timestamp: string;
}

// --- Utils ---
const shareSystem = () => {
  if (navigator.share) {
    navigator.share({
      title: 'MOBILE-HAJIRA',
      text: 'হাজিরা নেয়ার সেরা সিস্টেম - MOBILE-HAJIRA',
      url: window.location.origin,
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(window.location.origin);
    toast.success("Link copied to clipboard!");
  }
};

// --- Components ---

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  public state: {hasError: boolean, error: Error | null} = { hasError: false, error: null };
  
  constructor(props: {children: React.ReactNode}) {
    super(props);
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-gray-600 mb-4 text-center max-w-2xl font-mono bg-white p-4 rounded border overflow-auto">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#6f42c1] text-white px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Layout = ({ children, user, tenant, onLogout }: { children: React.ReactNode, user: UserData | null, tenant: Tenant | null, onLogout: () => void }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const menuItems = {
    SuperAdmin: [
      { label: "Dashboard", to: "/dashboard", icon: Home },
      { label: "Institute Management", to: "/institutes", icon: Database },
      { label: "Create Institute", to: "/institutes/create", icon: Plus },
      { label: "Payment Logs", to: "/payments", icon: History },
      { label: "User Management", to: "/users", icon: Users },
    ],
    InstitutionAdmin: [
      { label: "Institute Settings", to: "/settings/general", icon: Database },
      { label: "Teacher Management", to: "/teachers", icon: Users },
      { label: "Student Management", to: "/students", icon: Users },
      { label: "Course Management", to: "/subjects/add", icon: BookOpen },
      { label: "Attendance Report", to: "/reports", icon: FileText },
      { label: "Payment Management", to: "/wallet", icon: WalletIcon },
    ],
    Teacher: [
      { label: "Teachers Profile", to: "/teacher/profile", icon: User },
      { label: "Attendance Taker", to: "/scanner", icon: QrCode },
      { label: "Teachers Class Report", to: "/reports", icon: FileText },
      { label: "Attendance Report", to: "/reports/attendance", icon: ClipboardList },
    ],
    Student: [
      { label: "Attendance Giver", to: "/student/id", icon: QrCode },
      { label: "Student Profile", to: "/student/profile", icon: User },
      { label: "Student Self-Attendance Report", to: "/reports/self", icon: FileText },
    ],
  };

  const currentMenuItems = user ? menuItems[user.role] : [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#141414]">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E4E3E0] px-4 py-3 flex items-center justify-between shadow-sm">
        {!user ? (
          <>
            <div className="flex flex-col cursor-pointer" onClick={() => navigate("/")}>
              <h1 className="text-xl font-black text-[#6f42c1] leading-none">MOBILE-HAJIRA</h1>
              <p className="text-[10px] text-gray-500 font-bold mt-1">হাজিরা নেয়ার সেরা সিস্টেম</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate("/login")} className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-gray-100">Login</button>
              <button onClick={() => navigate("/register")} className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-[#6f42c1] text-white rounded-lg hover:bg-[#59359a]">Register</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                <span className="text-xs font-bold hidden sm:inline">মেন্যু</span>
              </button>
            </div>

            <div className="flex flex-col items-center text-center flex-1 mx-4">
              <h1 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">MOBILE-HAJIRA</h1>
              <h2 className="text-sm sm:text-lg font-black text-[#6f42c1] mt-1 line-clamp-1">{tenant?.name || "Institution"}</h2>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                {auth.currentUser?.photoURL || user.profile_image ? (
                  <img src={auth.currentUser?.photoURL || user.profile_image} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50"
                  >
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate(user.role === "Teacher" ? "/teacher/profile" : user.role === "Student" ? "/student/profile" : "/dashboard");
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Your Profile
                    </button>
                    {user.email === "hello@muradkhank31.com" && (
                      <button 
                        onClick={async () => {
                          setIsProfileOpen(false);
                          const nextRole = user.role === "SuperAdmin" ? "InstitutionAdmin" : "SuperAdmin";
                          await updateDoc(doc(db, "users", user.user_id), { role: nextRole });
                          toast.success(`Switched to ${nextRole}`);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-purple-600"
                      >
                        <ShieldCheck className="w-4 h-4" /> Switch to {user.role === "SuperAdmin" ? "Inst Admin" : "Super Admin"}
                      </button>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-red-500"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </header>

      <AnimatePresence>
        {isMenuOpen && user && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-black text-[#6f42c1]">MENU</h2>
                <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                {currentMenuItems.map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(item.to);
                    }}
                    className="w-full px-6 py-3 text-left flex items-center gap-4 hover:bg-purple-50 transition-colors group"
                  >
                    <item.icon className="w-5 h-5 text-gray-400 group-hover:text-[#6f42c1]" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-[#6f42c1]">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-4 pb-32">
        {children}
        
        {user && (
          <div className="mt-12 mb-8">
            {(user.role === "InstitutionAdmin" || user.role === "Teacher") ? (
              <div className="no-print bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 mx-auto max-w-md" style={{ paddingBottom: '80px' }}>
                <p className="font-bold text-gray-600 mb-4">Help Others and Get 20 Bonus Credits</p>
                <button 
                  onClick={shareSystem}
                  className="bg-purple-50 text-[#6f42c1] border border-purple-100 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:bg-purple-100 transition-all"
                >
                  <Share2 className="w-4 h-4" /> সিস্টেমটি শেয়ার করুন
                </button>
                
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <small className="text-gray-400 block">
                    MOBILE-HAJIRA Developed by
                  </small>
                  <a href="https://muradkhank31.com" target="_blank" rel="noopener noreferrer" className="text-[#6f42c1] font-black text-sm mt-1 inline-block hover:underline">
                    MuradKhanK31.com
                  </a>
                </div>
              </div>
            ) : user.role === "Student" ? (
              <div className="text-center py-8">
                <small className="text-gray-400 block">
                  MOBILE-HAJIRA Developed by
                </small>
                <a href="https://muradkhank31.com" target="_blank" rel="noopener noreferrer" className="text-[#6f42c1] font-black text-sm mt-1 inline-block hover:underline">
                  MuradKhanK31.com
                </a>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4E3E0] px-4 py-2 flex justify-around items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {user.role === "InstitutionAdmin" ? (
            <>
              <NavButton icon={Home} label="Dashboard" to="/dashboard" />
              <NavButton icon={WalletIcon} label="Payment" to="/wallet" />
              <NavButton icon={LifeBuoy} label="Support" to="/support" />
            </>
          ) : user.role === "Teacher" ? (
            <>
              <NavButton icon={QrCode} label="Attendance" to="/scanner" />
              <NavButton icon={FileText} label="Report" to="/reports" />
            </>
          ) : user.role === "Student" ? (
            <>
              <NavButton icon={QrCode} label="Attendance" to="/student/id" />
              <NavButton icon={FileText} label="Report" to="/reports/self" />
            </>
          ) : (
            <>
              <NavButton icon={Home} label="Dashboard" to="/dashboard" />
              <NavButton icon={Database} label="Inst" to="/institutes" />
              <NavButton icon={Users} label="Users" to="/users" />
            </>
          )}
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

const InstituteManagement = ({ user }: { user: UserData }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("sa_inst_cols");
    return saved ? JSON.parse(saved) : ["Actions", "EIIN", "Institution Name", "Admin Name", "Admin Mobile", "Last Active Date", "Credit Balance", "Status"];
  });

  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("sa_inst_cols", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const q = query(collection(db, "tenants"));
    return onSnapshot(q, (snapshot) => {
      setTenants(snapshot.docs.map(doc => doc.data() as Tenant).filter(t => t.tenant_id !== "SUPER_ADMIN_TENANT"));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "tenants"));
  }, []);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const getStats = (type: string) => {
    const filtered = tenants.filter(t => t.institutionType === type);
    const active = filtered.filter(t => t.last_active_date && new Date(t.last_active_date) >= sixtyDaysAgo).length;
    const inactive = filtered.length - active;
    return { active, inactive };
  };

  const allColumns = [
    "Actions", "EIIN", "Institution Name", "Department Name", "Admin Name", "Admin Mobile", "Admin Email",
    "Last Active Date", "Credit Balance", "Instance_ID", "Institute Website", "Status", "Plan",
    "Per Class Duration", "Teachers Registered Amount", "Students Registered Amount",
    "Total Credit Purchased", "Total Credit Used", "Last Reward Date", "Last Recharge Date",
    "Promo Code", "Promo Code Claimed?", "Referral Count"
  ];

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      await deleteDoc(doc(db, "tenants", tenantToDelete.tenant_id));
      toast.success("Institution deleted");
      setTenantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantToDelete.tenant_id}`);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await updateDoc(doc(db, "tenants", id), { status: "deactivated" });
      toast.success("Institution deactivated");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tenants/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Institute Management</h2>
        <button 
          onClick={() => navigate("/institutes/create")}
          className="bg-[#6f42c1] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Institute
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["College", "School", "Madrasa", "Coaching Center"].map(type => {
          const { active, inactive } = getStats(type);
          return (
            <Card key={type} className="p-4">
              <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">{type}</p>
              <div className="mt-2 flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold">{active + inactive}</p>
                  <p className="text-[10px] text-gray-400">Total</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-green-600">Active: {active}</p>
                  <p className="text-xs font-bold text-red-500">Inactive: {inactive}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Institutions List</h3>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {showSettings && (
          <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {allColumns.map(col => (
              <label key={col} className="flex items-center gap-2 text-xs cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.includes(col)}
                  onChange={() => toggleColumn(col)}
                  className="rounded text-[#6f42c1]"
                />
                {col}
              </label>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30 text-[10px] uppercase tracking-widest text-gray-400">
                {visibleColumns.map(col => <th key={col} className="p-4 font-bold">{col}</th>)}
              </tr>
            </thead>
            <tbody className="text-sm">
              {tenants.map(t => (
                <tr key={t.tenant_id} className="border-b border-gray-50 last:border-0 hover:bg-purple-50/30 transition-colors">
                  {visibleColumns.map(col => (
                    <td key={col} className="p-4">
                      {col === "Actions" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleDeactivate(t.tenant_id)} className="text-xs font-bold text-orange-500 hover:underline">Deactivate</button>
                          <button onClick={() => setTenantToDelete(t)} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                        </div>
                      )}
                      {col === "EIIN" && <span className="font-mono text-xs">{t.eiin}</span>}
                      {col === "Institution Name" && <span className="font-bold">{t.name}</span>}
                      {col === "Department Name" && <span>{t.departmentName || "N/A"}</span>}
                      {col === "Admin Name" && <span>{t.admin_name || "N/A"}</span>}
                      {col === "Admin Mobile" && <span>{t.admin_mobile || "N/A"}</span>}
                      {col === "Admin Email" && <span>{t.owner_email || "N/A"}</span>}
                      {col === "Last Active Date" && <span>{t.last_active_date ? new Date(t.last_active_date).toLocaleDateString() : "Never"}</span>}
                      {col === "Credit Balance" && <span className="font-bold text-[#6f42c1]">{t.credits_left}</span>}
                      {col === "Instance_ID" && <span className="font-mono text-xs text-gray-400">{t.tenant_id}</span>}
                      {col === "Institute Website" && <span className="text-blue-500 truncate max-w-[150px] inline-block">{t.website || "N/A"}</span>}
                      {col === "Status" && (
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          t.status === "deactivated" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}>
                          {t.status || "active"}
                        </span>
                      )}
                      {col === "Plan" && (
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          t.plan === "Paid" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        )}>
                          {t.plan || "Free Tier"}
                        </span>
                      )}
                      {col === "Per Class Duration" && <span>{t.class_duration || 45}m</span>}
                      {col === "Teachers Registered Amount" && <span>{t.teachers_amount || 0}</span>}
                      {col === "Students Registered Amount" && <span>{t.students_amount || 0}</span>}
                      {col === "Total Credit Purchased" && <span>{t.total_credit_purchased || 0}</span>}
                      {col === "Total Credit Used" && <span>{t.total_credit_used || 0}</span>}
                      {col === "Last Reward Date" && <span>{t.last_reward_date || "N/A"}</span>}
                      {col === "Last Recharge Date" && <span>{t.last_recharge_date || "N/A"}</span>}
                      {col === "Promo Code" && <span className="font-mono text-[#6f42c1]">{t.promo_code}</span>}
                      {col === "Promo Code Claimed?" && <span>{t.promo_code_claimed ? "Yes" : "No"}</span>}
                      {col === "Referral Count" && <span>{t.referral_count || 0}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {tenantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-red-600">Delete Institution</h3>
            <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{tenantToDelete.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateInstitute = ({ user }: { user: UserData }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const tenantId = "INST_" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const promoCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    const newTenant: Tenant = {
      tenant_id: tenantId,
      name: formData.get("name") as string,
      eiin: formData.get("eiin") as string,
      institutionType: formData.get("type") as any,
      departmentName: formData.get("dept") as string || "",
      admin_name: formData.get("adminName") as string,
      admin_mobile: formData.get("adminMobile") as string,
      owner_email: formData.get("adminEmail") as string,
      credits_left: 10,
      promo_code: promoCode,
      referral_count: 0,
      status: "active",
      plan: "Free Tier",
      class_duration: 45,
      total_credit_used: 0,
      total_credit_purchased: 0,
      last_active_date: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "tenants", tenantId), newTenant);
      toast.success("Institution created successfully!");
      navigate("/institutes");
    } catch (error: any) {
      toast.error("Failed to create institution: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-[#6f42c1] font-bold text-xs uppercase tracking-wider hover:underline flex items-center gap-1">
        &larr; Back
      </button>
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6">Create New Institute</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Institution Name</label>
            <input required name="name" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">EIIN / Reg No</label>
            <input required name="eiin" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
            <select required name="type" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]">
              <option value="School">School</option>
              <option value="College">College</option>
              <option value="Madrasa">Madrasa</option>
              <option value="Coaching Center">Coaching Center</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Department Name (Optional)</label>
            <input name="dept" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Admin Name</label>
            <input required name="adminName" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Admin Mobile</label>
            <input required name="adminMobile" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Admin Email</label>
            <input required name="adminEmail" type="email" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" />
          </div>
          <div className="md:col-span-2 pt-4">
            <button disabled={loading} type="submit" className="w-full bg-[#6f42c1] text-white py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Institution"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const SuperAdminDashboard = ({ user }: { user: UserData }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [admins, setAdmins] = useState<Record<string, UserData>>({});
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"institutions" | "payments" | "users">("institutions");
  const [instFilter, setInstFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) throw asyncError;

  useEffect(() => {
    if (user.role !== "SuperAdmin") return;
    
    const unsubTenants = onSnapshot(query(collection(db, "tenants")), (snapshot) => {
      setTenants(snapshot.docs.map(doc => doc.data() as Tenant).filter(t => t.tenant_id !== "SUPER_ADMIN_TENANT"));
    }, (error) => setAsyncError(error as Error));

    const unsubTransactions = onSnapshot(query(collection(db, "transactions")), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (error) => setAsyncError(error as Error));

    const unsubAdmins = onSnapshot(query(collection(db, "users"), where("role", "==", "InstitutionAdmin")), (snapshot) => {
      const adminMap: Record<string, UserData> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserData;
        adminMap[data.tenant_id] = data;
      });
      setAdmins(adminMap);
    }, (error) => setAsyncError(error as Error));

    const unsubUsers = onSnapshot(query(collection(db, "users"), limit(50)), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserData));
      setLoading(false);
    }, (error) => setAsyncError(error as Error));

    return () => {
      unsubTenants();
      unsubTransactions();
      unsubAdmins();
      unsubUsers();
    };
  }, [user.role]);

  if (user.role !== "SuperAdmin") {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  const earnedMoney = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const activeInstitutionsCount = tenants.filter(t => t.last_active_date && new Date(t.last_active_date) >= sixtyDaysAgo).length;
  const inactiveInstitutionsCount = tenants.length - activeInstitutionsCount;

  const filteredTenants = tenants.filter(t => {
    if (instFilter === "active") return t.last_active_date && new Date(t.last_active_date) >= sixtyDaysAgo;
    if (instFilter === "inactive") return !t.last_active_date || new Date(t.last_active_date) < sixtyDaysAgo;
    return true;
  }).slice(0, 10);

  const lastTenTransactions = [...transactions].sort((a, b) => 
    new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  ).slice(0, 10);

  const lastTenUsers = [...allUsers].slice(0, 10);

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      await deleteDoc(doc(db, "tenants", tenantToDelete.tenant_id));
      toast.success("Institution deleted successfully");
      setTenantToDelete(null);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantToDelete.tenant_id}`);
      } catch (e) {
        setAsyncError(e as Error);
      }
    }
  };

  if (selectedTenant) {
    const admin = admins[selectedTenant.tenant_id];
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTenant(null)} className="text-[#6f42c1] font-bold text-xs uppercase tracking-wider hover:underline flex items-center gap-1">
          &larr; Back to Dashboard
        </button>
        <Card title="Institution Details" icon={Database}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">License ID</span><span className="font-mono">{selectedTenant.tenant_id}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Institution Name</span><span className="font-bold">{selectedTenant.name}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">EIIN</span><span className="font-mono">{selectedTenant.eiin}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Owner Email</span><span>{selectedTenant.owner_email || admin?.email || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Admin Name</span><span>{selectedTenant.admin_name || admin?.name || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Admin Mobile</span><span>{selectedTenant.admin_mobile || admin?.phone || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Website</span><span>{selectedTenant.website || "N/A"}</span></div>
              <div>
                <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Status</span>
                <select 
                  className="border rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#6f42c1]"
                  value={selectedTenant.status || "active"}
                  onChange={(e) => updateDoc(doc(db, "tenants", selectedTenant.tenant_id), { status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Plan</span><span>{selectedTenant.plan || "Free Tier"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Class Duration</span><span>{selectedTenant.class_duration || 45} mins</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Teachers Amount</span><span>{selectedTenant.teachers_amount || 0}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Students Amount</span><span>{selectedTenant.students_amount || 0}</span></div>
            </div>
            <div className="space-y-4">
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Last Active Date</span><span>{selectedTenant.last_active_date ? new Date(selectedTenant.last_active_date).toLocaleString() : "Never"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Credits Left</span><span className="font-bold text-[#6f42c1]">{selectedTenant.credits_left}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Total Credit Used</span><span>{selectedTenant.total_credit_used || 0}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Last Reward Date</span><span>{selectedTenant.last_reward_date || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Promo Code Claimed?</span><span>{selectedTenant.promo_code_claimed ? "Yes" : "No"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Recharge Status</span><span>{selectedTenant.recharge_status || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Last Recharge Date</span><span>{selectedTenant.last_recharge_date || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Referral Link</span><span className="text-blue-500 break-all">{selectedTenant.referral_link || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Promo Code</span><span className="font-mono text-[#6f42c1]">{selectedTenant.promo_code || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Referral Count</span><span>{selectedTenant.referral_count || 0}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Attendance App Link</span><span className="text-blue-500 break-all">{selectedTenant.attendance_app_link || "N/A"}</span></div>
              <div><span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest block">Attendance App PIN</span><span className="font-mono">{selectedTenant.attendance_app_pin || "N/A"}</span></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Dashboard</h2>
          <p className="text-muted-foreground text-sm">Super Admin control panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={() => { setActiveTab("institutions"); setInstFilter("all"); }}
          className="text-left"
        >
          <Card className="bg-white border-[#E4E3E0] hover:border-[#6f42c1] transition-all cursor-pointer h-full">
            <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Registered Institute/Dept.</p>
            <h3 className="text-3xl font-bold mt-1 text-[#6f42c1]">{tenants.length}</h3>
          </Card>
        </button>
        <button 
          onClick={() => { setActiveTab("institutions"); setInstFilter("active"); }}
          className="text-left"
        >
          <Card className="bg-white border-[#E4E3E0] hover:border-green-500 transition-all cursor-pointer h-full">
            <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Active Institute</p>
            <h3 className="text-3xl font-bold mt-1 text-green-600">{activeInstitutionsCount}</h3>
          </Card>
        </button>
        <button 
          onClick={() => { setActiveTab("institutions"); setInstFilter("inactive"); }}
          className="text-left"
        >
          <Card className="bg-white border-[#E4E3E0] hover:border-red-500 transition-all cursor-pointer h-full">
            <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Inactive Institute</p>
            <h3 className="text-3xl font-bold mt-1 text-red-500">{inactiveInstitutionsCount}</h3>
          </Card>
        </button>
        <button 
          onClick={() => setActiveTab("payments")}
          className="text-left"
        >
          <Card className="bg-white border-[#E4E3E0] hover:border-blue-500 transition-all cursor-pointer h-full">
            <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Earned Money</p>
            <h3 className="text-3xl font-bold mt-1 text-blue-600">৳{earnedMoney}</h3>
          </Card>
        </button>
      </div>

      <div className="flex gap-2 border-b border-[#E4E3E0] pb-2 overflow-x-auto">
        <button 
          onClick={() => { setActiveTab("institutions"); setInstFilter("all"); }}
          className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors whitespace-nowrap", activeTab === "institutions" ? "bg-[#6f42c1] text-white" : "text-gray-500 hover:bg-gray-100")}
        >
          Institutions
        </button>
        <button 
          onClick={() => setActiveTab("payments")}
          className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors whitespace-nowrap", activeTab === "payments" ? "bg-[#6f42c1] text-white" : "text-gray-500 hover:bg-gray-100")}
        >
          Payment Logs
        </button>
        <button 
          onClick={() => setActiveTab("users")}
          className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors whitespace-nowrap", activeTab === "users" ? "bg-[#6f42c1] text-white" : "text-gray-500 hover:bg-gray-100")}
        >
          User Management
        </button>
      </div>

      {activeTab === "institutions" && (
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#6f42c1]" /></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#E4E3E0] bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="p-4 font-bold">EIIN</th>
                  <th className="p-4 font-bold">Institution Name</th>
                  <th className="p-4 font-bold">Admin Name</th>
                  <th className="p-4 font-bold">Admin Mobile</th>
                  <th className="p-4 font-bold">Registered Email</th>
                  <th className="p-4 font-bold">Last Active Date</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredTenants.map(t => {
                  const admin = admins[t.tenant_id];
                  return (
                    <tr key={t.tenant_id} className="border-b border-[#E4E3E0] last:border-0 hover:bg-gray-50/50">
                      <td className="p-4 font-mono text-xs text-gray-500">{t.eiin}</td>
                      <td className="p-4 font-medium">{t.name}</td>
                      <td className="p-4">{t.admin_name || admin?.name || "N/A"}</td>
                      <td className="p-4">{t.admin_mobile || admin?.phone || "N/A"}</td>
                      <td className="p-4">{t.owner_email || admin?.email || "N/A"}</td>
                      <td className="p-4">{t.last_active_date ? new Date(t.last_active_date).toLocaleDateString() : "Never"}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedTenant(t)}
                          className="text-[#6f42c1] hover:text-[#59359a] text-[10px] font-bold uppercase tracking-wider bg-purple-50 px-3 py-1.5 rounded-md"
                        >
                          Details
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, "tenants", t.tenant_id), { status: "deactivated" });
                              toast.success("Institution deactivated");
                            } catch (e: any) {
                              toast.error("Failed to deactivate: " + e.message);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-md"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === "payments" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E4E3E0] bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="p-4 font-bold">Timestamp</th>
                <th className="p-4 font-bold">Sender Mobile</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">TrxID</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Claimed By</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {lastTenTransactions.map(t => (
                <tr key={t.trx_id} className="border-b border-[#E4E3E0] last:border-0 hover:bg-gray-50/50">
                  <td className="p-4">{t.timestamp ? new Date(t.timestamp).toLocaleString() : "N/A"}</td>
                  <td className="p-4 font-mono text-xs">{t.sender_number}</td>
                  <td className="p-4 font-bold text-green-600">৳{t.amount}</td>
                  <td className="p-4 font-mono text-xs text-[#6f42c1]">{t.trx_id}</td>
                  <td className="p-4">
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", t.status === "used" ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-700")}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {t.claimed_by_tenant ? (
                      <button 
                        onClick={() => {
                          const tenant = tenants.find(ten => ten.tenant_id === t.claimed_by_tenant);
                          if (tenant) setSelectedTenant(tenant);
                        }}
                        className="text-blue-500 hover:underline font-mono text-xs"
                      >
                        {t.claimed_by_tenant}
                      </button>
                    ) : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "users" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E4E3E0] bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Role</th>
                <th className="p-4 font-bold">Tenant ID</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {lastTenUsers.map(u => (
                <tr key={u.user_id} className="border-b border-[#E4E3E0] last:border-0 hover:bg-gray-50/50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4">{u.email || "N/A"}</td>
                  <td className="p-4">
                    <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", 
                      u.role === "SuperAdmin" ? "bg-red-100 text-red-700" : 
                      u.role === "InstitutionAdmin" ? "bg-purple-100 text-purple-700" : 
                      u.role === "Teacher" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-xs text-gray-500">{u.tenant_id}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {
                        const tenant = tenants.find(t => t.tenant_id === u.tenant_id);
                        if (tenant) setSelectedTenant(tenant);
                      }}
                      className="text-[#6f42c1] hover:underline text-xs font-bold uppercase tracking-wider"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tenantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-red-600">Delete Institution</h3>
            <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{tenantToDelete.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTenant}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-16 py-12">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-6 max-w-3xl w-full px-4"
      >
        <ShieldCheck className="w-20 h-20 text-[#6f42c1] mx-auto mb-8" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          খাতা-কলম আর নয়,<br/><span className="text-[#6f42c1]">হাজিরা এখন মোবাইলে!</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mt-6">
          মাত্র ২ মিনিটে ক্লাসের হাজিরা নিন, অটোমেটিক রিপোর্ট তৈরি করুন এবং হাজার হাজার শিক্ষার্থীর আইডি কার্ড জেনারেট করুন।
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <button 
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto bg-[#6f42c1] text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          >
            <LogIn className="w-5 h-5" />
            লগইন করুন
          </button>
          <button 
            onClick={() => navigate("/register")}
            className="w-full sm:w-auto bg-white text-[#6f42c1] border-2 border-[#6f42c1] px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            রেজিস্ট্রেশন করুন
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4"
      >
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">২ মিনিটে হাজিরা</h3>
          <p className="text-gray-600 leading-relaxed">QR স্ক্যানার অথবা চেকবক্স—যেকোনো পদ্ধতিতে দ্রুত হাজিরা নিন।</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">অটোমেটিক রিপোর্ট</h3>
          <p className="text-gray-600 leading-relaxed">মাস শেষে এক ক্লিকে PDF রিপোর্ট তৈরি করুন।</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-left space-y-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-[#6f42c1]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">ফ্রি আইডি কার্ড জেনারেটর</h3>
          <p className="text-gray-600 leading-relaxed">হাজার হাজার শিক্ষার্থীর আইডি কার্ড তৈরি করুন ৩০ সেকেন্ডে।</p>
        </div>
      </motion.div>
    </div>
  );
};

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center space-y-8">
          <ShieldCheck className="w-16 h-16 text-[#6f42c1] mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">লগইন করুন</h2>
            <p className="text-sm text-gray-500">আপনার জিমেইল অ্যাকাউন্ট ব্যবহার করে লগইন করুন</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Google দিয়ে লগইন
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              অ্যাকাউন্ট নেই? <button onClick={() => navigate("/register")} className="text-[#6f42c1] font-bold hover:underline">রেজিস্ট্রেশন করুন</button>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"InstitutionAdmin" | "Teacher" | "Student">("InstitutionAdmin");
  const [agreed, setAgreed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

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
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="p-8 space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-[#6f42c1]">রেজিস্ট্রেশন করুন</h2>
            <p className="text-gray-500">আপনার সঠিক রোল নির্বাচন করে এগিয়ে যান</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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

          <AnimatePresence mode="wait">
            {role === "InstitutionAdmin" && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
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
              </motion.div>
            )}

            {role === "Teacher" && (
              <motion.div 
                key="teacher"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
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
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "রেজিস্ট্রেশন করুন"}
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {role === "Student" && (
              <motion.div 
                key="student"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                  <p className="text-sm text-orange-900 leading-relaxed">
                    ”আপনার প্রতিষ্ঠানের EIIN/Registration Number বা নাম দিয়ে সার্চ করুন”
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
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">বিভাগ (যদি থাকে)</label>
                        <input name="dept" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="বিভাগ লিখুন" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">ক্লাস</label>
                        <input required name="class" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="ক্লাস লিখুন" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">সেশন/বর্ষ</label>
                        <input required name="session" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="সেশন লিখুন" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">রোল</label>
                        <input required name="roll" type="text" className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="রোল লিখুন" />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-[#6f42c1] text-white py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-[#59359a] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "নিবন্ধিত হোন"}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              ইতিমধ্যে অ্যাকাউন্ট আছে? <button onClick={() => navigate("/login")} className="text-[#6f42c1] font-bold hover:underline">লগইন করুন</button>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const TeacherDashboard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] font-bold text-xl overflow-hidden">
          {user.profile_image ? <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold">{user.name}</h2>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Teacher • {user.teacher_id || "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => navigate("/scanner")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1]">
            <QrCode className="w-6 h-6" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Attendance Taker</span>
        </button>
        <button 
          onClick={() => navigate("/reports")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-gray-700">Class Report</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        <button 
          onClick={() => navigate("/teacher/profile")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Teachers Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button 
          onClick={() => navigate("/reports/attendance")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Attendance Report</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

const StudentDashboard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl overflow-hidden">
          {user.profile_image ? <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold">{user.name}</h2>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Student • {user.student_id || "N/A"}</p>
          <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">Class: {user.class || "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => navigate("/student/id")}
          className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-sm text-gray-800">Attendance Giver (My ID)</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Show this to your teacher</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
        <button 
          onClick={() => navigate("/student/profile")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Student Profile</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
        <button 
          onClick={() => navigate("/reports/self")}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Self-Attendance Report</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

const InstitutionAdminDashboard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const navigate = useNavigate();
  const [pendingTeachers, setPendingTeachers] = useState(0);
  const [pendingStudents, setPendingStudents] = useState(0);

  useEffect(() => {
    const qT = query(collection(db, "users"), where("tenant_id", "==", user.tenant_id), where("role", "==", "Teacher"), where("status", "==", "pending"));
    const qS = query(collection(db, "users"), where("tenant_id", "==", user.tenant_id), where("role", "==", "Student"), where("status", "==", "pending"));
    
    const unsubT = onSnapshot(qT, (s) => setPendingTeachers(s.size));
    const unsubS = onSnapshot(qS, (s) => setPendingStudents(s.size));
    
    return () => { unsubT(); unsubS(); };
  }, [user.tenant_id]);

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">ক্রেডিট ব্যালেন্স</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#6f42c1]">{tenant?.credits_left || 0}</span>
            <span className="text-xs text-gray-400 font-medium">Credits</span>
          </div>
        </div>
        <button 
          onClick={() => navigate("/wallet")}
          className="bg-gradient-to-r from-[#6f42c1] to-[#59359a] hover:from-[#59359a] hover:to-[#4a2c82] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <WalletIcon className="w-4 h-4" />
          রিচার্জ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => navigate("/reports")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">অ্যাটেন্ডেন্স রিপোর্ট</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => navigate("/teachers")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">শিক্ষক ম্যানেজমেন্ট</span>
              {pendingTeachers > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingTeachers}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => navigate("/students")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">শিক্ষার্থী ম্যানেজমেন্ট</span>
              {pendingStudents > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingStudents}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => navigate("/subjects/add")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1]">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">কোর্স ম্যানেজমেন্ট</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => navigate("/wallet")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <WalletIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">পেমেন্ট ম্যানেজমেন্ট</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">সেটিংস</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <button 
            onClick={() => navigate("/settings/general")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-700">ইনস্টিটিউট সেটিংস</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
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
    return () => { scanner.clear().catch(console.error); };
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

const TeachersList = ({ user }: { user: UserData }) => {
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("tenant_id", "==", user.tenant_id),
      where("role", "==", "Teacher")
    );
    return onSnapshot(q, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => doc.data() as UserData));
      setLoading(false);
    });
  }, [user.tenant_id]);

  const handleApprove = async (teacherId: string) => {
    try {
      await updateDoc(doc(db, "users", teacherId), { status: "approved" });
      toast.success("Teacher approved!");
    } catch (error: any) {
      toast.error("Approval failed: " + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষক তালিকা (Teachers List)</h2>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" /></div>
      ) : teachers.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No teachers found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {teachers.map(t => (
            <Card key={t.user_id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#6f42c1] font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t.phone || t.email}</p>
                  </div>
                </div>
                {t.status === "pending" ? (
                  <button 
                    onClick={() => handleApprove(t.user_id)}
                    className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded">Approved</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentsList = ({ user }: { user: UserData }) => {
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("tenant_id", "==", user.tenant_id),
      where("role", "==", "Student")
    );
    return onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => doc.data() as UserData));
      setLoading(false);
    });
  }, [user.tenant_id]);

  const handleApprove = async (studentId: string) => {
    try {
      await updateDoc(doc(db, "users", studentId), { status: "approved" });
      toast.success("Student approved!");
    } catch (error: any) {
      toast.error("Approval failed: " + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষার্থী তালিকা (Students List)</h2>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#6f42c1]" /></div>
      ) : students.length === 0 ? (
        <Card>
          <div className="text-center py-10 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No students found.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map(s => (
            <Card key={s.user_id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{s.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Roll: {s.student_id} • Class: {s.class}</p>
                  </div>
                </div>
                {s.status === "pending" ? (
                  <button 
                    onClick={() => handleApprove(s.user_id)}
                    className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded">Approved</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ReportsView = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">রিপোর্ট (Reports)</h2>
      <Card>
        <div className="text-center py-10 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No reports available yet.</p>
        </div>
      </Card>
    </div>
  );
};

const GeneralSettings = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">প্রাথমিক সেটিংস (General Settings)</h2>
      <Card>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Institution Name</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter institution name" />
          </div>
          <button className="w-full bg-[#6f42c1] text-white font-bold py-2 rounded-lg hover:bg-[#59359a] transition-colors">Save Settings</button>
        </div>
      </Card>
    </div>
  );
};

const AddTeacher = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষক যোগ করুন (Add Teacher)</h2>
      <Card>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Teacher Name</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter teacher name" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email / Phone</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter contact info" />
          </div>
          <button className="w-full bg-[#6f42c1] text-white font-bold py-2 rounded-lg hover:bg-[#59359a] transition-colors">Add Teacher</button>
        </div>
      </Card>
    </div>
  );
};

const AddStudent = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষার্থী যোগ করুন (Add Student)</h2>
      <Card>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Student Name</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter student name" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Roll Number</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter roll number" />
          </div>
          <button className="w-full bg-[#6f42c1] text-white font-bold py-2 rounded-lg hover:bg-[#59359a] transition-colors">Add Student</button>
        </div>
      </Card>
    </div>
  );
};

const AddSubject = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">বিষয় যোগ করুন (Add Subject)</h2>
      <Card>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Subject Name</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Enter subject name" />
          </div>
          <button className="w-full bg-[#6f42c1] text-white font-bold py-2 rounded-lg hover:bg-[#59359a] transition-colors">Add Subject</button>
        </div>
      </Card>
    </div>
  );
};

const TeacherProfile = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Teachers Profile</h2>
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#6f42c1] to-[#59359a] h-24"></div>
        <div className="px-6 pb-6 -mt-12 text-center">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-purple-100 mx-auto flex items-center justify-center text-[#6f42c1] font-bold text-3xl overflow-hidden shadow-md">
            {user.profile_image ? <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-4 text-xl font-bold">{user.name}</h3>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Teacher</p>
          
          <div className="mt-8 space-y-4 text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email</p>
                <p className="text-sm">{user.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Phone</p>
                <p className="text-sm">{user.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Teacher ID</p>
                <p className="text-sm font-mono">{user.teacher_id || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const StudentProfile = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Student Profile</h2>
      <Card className="p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-24"></div>
        <div className="px-6 pb-6 -mt-12 text-center">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-orange-100 mx-auto flex items-center justify-center text-orange-600 font-bold text-3xl overflow-hidden shadow-md">
            {user.profile_image ? <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-4 text-xl font-bold">{user.name}</h3>
          <p className="text-xs text-gray-500 uppercase font-mono tracking-wider">Student</p>
          
          <div className="mt-8 space-y-4 text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Email</p>
                <p className="text-sm">{user.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Phone</p>
                <p className="text-sm">{user.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Student ID</p>
                <p className="text-sm font-mono">{user.student_id || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Class</p>
                <p className="text-sm">{user.class || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const StudentIDCard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800 text-center">Digital ID Card</h2>
      <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#6f42c1]"></div>
        <div className="text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold uppercase tracking-tight">{tenant?.name || "Institution Name"}</h3>
            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest">Digital Student ID</p>
          </div>
          
          <div className="w-32 h-32 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center border-4 border-gray-50 shadow-inner overflow-hidden">
            {user.profile_image ? <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-gray-300" />}
          </div>

          <div className="space-y-1">
            <h4 className="text-xl font-bold text-gray-900">{user.name}</h4>
            <p className="text-sm font-medium text-[#6f42c1]">{user.student_id}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <QrCode className="w-32 h-32 text-[#6f42c1]" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scan for Attendance</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="text-left">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Class</p>
              <p className="text-sm font-bold">{user.class || "N/A"}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Valid Until</p>
              <p className="text-sm font-bold">Dec 2026</p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 italic">Show this QR code to your teacher to mark attendance.</p>
    </div>
  );
};

function AppContent() {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  if (asyncError) throw asyncError;

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setAsyncError(new Error("Firebase connection failed: The client is offline. Please check your configuration."));
        }
      }
    }
    testConnection();

    let tenantUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            
            if (!userData.email && firebaseUser.email) {
              userData.email = firebaseUser.email;
              updateDoc(doc(db, "users", firebaseUser.uid), { email: firebaseUser.email }).catch(console.error);
            }
            
            // We removed the forced SuperAdmin override here so the user can switch roles
            
            setUser(userData);

            if (userData.tenant_id) {
              // Listen for tenant updates
              if (tenantUnsub) tenantUnsub();
              tenantUnsub = onSnapshot(doc(db, "tenants", userData.tenant_id), (doc) => {
                if (doc.exists()) {
                  setTenant(doc.data() as Tenant);
                }
              }, (error) => {
                try {
                  handleFirestoreError(error, OperationType.GET, `tenants/${userData.tenant_id}`);
                } catch (e) {
                  setAsyncError(e as Error);
                }
              });
              setLoading(false);
            } else {
              setLoading(false);
            }
          } else {
            // If user doesn't exist, create a default InstitutionAdmin for demo
            const isSuperAdmin = firebaseUser.email === "hello@muradkhank31.com";
            
            // Check if there's pending registration data
            const pendingRegStr = localStorage.getItem('pendingRegistration');
            const pendingReg = pendingRegStr ? JSON.parse(pendingRegStr) : null;
            
            const newTenantId = isSuperAdmin ? "SUPER_ADMIN_TENANT" : `tenant_${Math.random().toString(36).substr(2, 9)}`;
            const promoCode = `MH-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            
            const newTenant: Tenant = {
              tenant_id: newTenantId,
              name: isSuperAdmin ? "Super Admin" : (pendingReg?.name || firebaseUser.displayName || "New Institution"),
              eiin: isSuperAdmin ? "000000" : (pendingReg?.eiin || "123456"),
              credits_left: isSuperAdmin ? 999999 : 100,
              promo_code: promoCode,
              referral_count: 0,
              admin_name: pendingReg?.adminName || firebaseUser.displayName || "",
              admin_mobile: pendingReg?.phone || "",
              owner_email: pendingReg?.email || firebaseUser.email || ""
            };

            const newUser: UserData = {
              user_id: firebaseUser.uid,
              tenant_id: newTenantId,
              role: isSuperAdmin ? "SuperAdmin" : (pendingReg?.role || "InstitutionAdmin"),
              name: pendingReg?.userName || pendingReg?.name || firebaseUser.displayName || "User",
              email: pendingReg?.email || firebaseUser.email || "",
              phone: pendingReg?.phone || "",
              teacher_id: pendingReg?.teacher_id || "",
              student_id: pendingReg?.student_id || "",
              class: pendingReg?.class || "",
              section: pendingReg?.session || "",
              status: isSuperAdmin || (pendingReg?.role === "InstitutionAdmin") ? "approved" : "pending"
            };
            localStorage.removeItem('pendingRegistration');
            try {
              await setDoc(doc(db, "tenants", newTenantId), newTenant);
              await setDoc(doc(db, "users", firebaseUser.uid), newUser);
              if (tenantUnsub) tenantUnsub();
              tenantUnsub = onSnapshot(doc(db, "tenants", newTenantId), (doc) => {
                if (doc.exists()) {
                  setTenant(doc.data() as Tenant);
                }
              }, (error) => {
                try {
                  handleFirestoreError(error, OperationType.GET, `tenants/${newTenantId}`);
                } catch (e) {
                  setAsyncError(e as Error);
                }
              });
              setUser(newUser);
              setTenant(newTenant);
              setLoading(false);
            } catch (error) {
              try {
                handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
              } catch (e) {
                setAsyncError(e as Error);
              }
              setLoading(false);
            }
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (e) {
            setAsyncError(e as Error);
          }
          setLoading(false);
        }
      } else {
        setUser(null);
        setTenant(null);
        setLoading(false);
        if (tenantUnsub) {
          tenantUnsub();
          tenantUnsub = null;
        }
      }
    });

    return () => {
      authUnsub();
      if (tenantUnsub) {
        tenantUnsub();
      }
    };
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
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
          <Route path="/dashboard" element={
            !user ? <Navigate to="/login" /> : 
            (user.role === "Teacher" || user.role === "Student") && user.status === "pending" ? (
              <div className="min-h-[60vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                  <AlertCircle className="w-16 h-16 text-orange-500 mx-auto" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-800">অপেক্ষমান অনুমোদন</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      আপনার একাউন্টটি এখনো Institute Admin দ্বারা এপ্রুভ হয়নি।
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-left space-y-2">
                    <p className="text-xs font-bold text-orange-800 uppercase tracking-widest">যোগাযোগ করুন:</p>
                    <p className="text-sm font-bold text-gray-800">{tenant?.admin_name || "Institute Admin"}</p>
                    <p className="text-xs text-gray-600">মোবাইল: {tenant?.admin_mobile || "N/A"}</p>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                  >
                    লগ আউট করুন
                  </button>
                </Card>
              </div>
            ) :
            user.role === "SuperAdmin" ? <SuperAdminDashboard user={user} /> : 
            user.role === "InstitutionAdmin" ? <InstitutionAdminDashboard user={user} tenant={tenant} /> :
            user.role === "Teacher" ? <TeacherDashboard user={user} tenant={tenant} /> :
            <StudentDashboard user={user} tenant={tenant} />
          } />
          <Route path="/institutes" element={user?.role === "SuperAdmin" ? <InstituteManagement user={user} /> : <Navigate to="/login" />} />
          <Route path="/institutes/create" element={user?.role === "SuperAdmin" ? <CreateInstitute user={user} /> : <Navigate to="/login" />} />
          <Route path="/courses" element={user ? <div className="p-8">Course Management Coming Soon</div> : <Navigate to="/login" />} />
          <Route path="/users" element={user?.role === "SuperAdmin" ? <div className="p-8">User Management View</div> : <Navigate to="/login" />} />
          <Route path="/payments" element={user ? <div className="p-8">Payment History View</div> : <Navigate to="/login" />} />
          <Route path="/scanner" element={user ? <Scanner user={user} /> : <Navigate to="/login" />} />
          <Route path="/wallet" element={user ? <WalletView user={user} tenant={tenant} /> : <Navigate to="/login" />} />
          <Route path="/students" element={user ? <StudentsList user={user} /> : <Navigate to="/login" />} />
          <Route path="/reports" element={user ? <ReportsView user={user} /> : <Navigate to="/login" />} />
          <Route path="/reports/attendance" element={user ? <ReportsView user={user} /> : <Navigate to="/login" />} />
          <Route path="/reports/self" element={user ? <ReportsView user={user} /> : <Navigate to="/login" />} />
          <Route path="/teachers" element={user ? <TeachersList user={user} /> : <Navigate to="/login" />} />
          <Route path="/settings/general" element={user ? <GeneralSettings user={user} /> : <Navigate to="/login" />} />
          <Route path="/teachers/add" element={user ? <AddTeacher user={user} /> : <Navigate to="/login" />} />
          <Route path="/students/add" element={user ? <AddStudent user={user} /> : <Navigate to="/login" />} />
          <Route path="/subjects/add" element={user ? <AddSubject user={user} /> : <Navigate to="/login" />} />
          <Route path="/teacher/profile" element={user ? <TeacherProfile user={user} /> : <Navigate to="/login" />} />
          <Route path="/student/profile" element={user ? <StudentProfile user={user} /> : <Navigate to="/login" />} />
          <Route path="/student/id" element={user ? <StudentIDCard user={user} tenant={tenant} /> : <Navigate to="/login" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

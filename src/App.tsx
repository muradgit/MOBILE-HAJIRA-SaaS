"use client";

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, increment, setDoc, deleteDoc, getDocFromServer } from "firebase/firestore";
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
  Home
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
  status?: "active" | "suspended";
  plan?: "Free Tier" | "Paid";
  class_duration?: number;
  total_credit_used?: number;
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
}

interface UserData {
  user_id: string;
  tenant_id: string;
  role: "SuperAdmin" | "SchoolAdmin" | "Teacher";
  name: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  trx_id: string;
  amount: number;
  sender_number: string;
  status: "unused" | "used";
  claimed_by_tenant: string;
  timestamp: string;
}

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
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#141414]">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E4E3E0] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[#6f42c1]" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tight leading-none">Mobile-Hajira</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {tenant ? tenant.name : "Smart Attendance System"}
            </p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => navigate("/")}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5 text-gray-500" />
            </button>
            {user.email === "hello@muradkhank31.com" && (
              <button
                onClick={async () => {
                  const newRole = user.role === "SuperAdmin" ? "SchoolAdmin" : "SuperAdmin";
                  try {
                    await updateDoc(doc(db, "users", user.user_id), { role: newRole });
                    toast.success(`Switched to ${newRole === "SchoolAdmin" ? "InstitutionAdmin" : "SuperAdmin"}`);
                  } catch (e: any) {
                    toast.error("Failed to switch role: " + e.message);
                  }
                }}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#6f42c1] rounded-md hover:bg-purple-200 transition-colors"
                title="Switch Role (Admin Only)"
              >
                Switch to {user.role === "SuperAdmin" ? "InstitutionAdmin" : "SuperAdmin"}
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{user.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-mono">{user.role === "SchoolAdmin" ? "InstitutionAdmin" : user.role}</p>
            </div>
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
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
      {user && user.role !== "SuperAdmin" && (
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

const SuperAdminDashboard = ({ user }: { user: UserData }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [admins, setAdmins] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"institutions" | "payments">("institutions");
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

    const unsubAdmins = onSnapshot(query(collection(db, "users"), where("role", "==", "SchoolAdmin")), (snapshot) => {
      const adminMap: Record<string, UserData> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserData;
        adminMap[data.tenant_id] = data;
      });
      setAdmins(adminMap);
      setLoading(false);
    }, (error) => setAsyncError(error as Error));

    return () => {
      unsubTenants();
      unsubTransactions();
      unsubAdmins();
    };
  }, [user.role]);

  if (user.role !== "SuperAdmin") {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  const earnedMoney = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeInstitutions = tenants.filter(t => t.last_active_date && new Date(t.last_active_date) >= sevenDaysAgo).length;
  const inactiveInstitutions = tenants.length - activeInstitutions;

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
        <Card className="bg-white border-[#E4E3E0]">
          <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Institution Registered</p>
          <h3 className="text-3xl font-bold mt-1 text-[#6f42c1]">{tenants.length}</h3>
        </Card>
        <Card className="bg-white border-[#E4E3E0]">
          <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Active Institution</p>
          <h3 className="text-3xl font-bold mt-1 text-green-600">{activeInstitutions}</h3>
        </Card>
        <Card className="bg-white border-[#E4E3E0]">
          <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Inactive Institution</p>
          <h3 className="text-3xl font-bold mt-1 text-red-500">{inactiveInstitutions}</h3>
        </Card>
        <Card className="bg-white border-[#E4E3E0]">
          <p className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground">Earned Money</p>
          <h3 className="text-3xl font-bold mt-1 text-blue-600">৳{earnedMoney}</h3>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-[#E4E3E0] pb-2">
        <button 
          onClick={() => setActiveTab("institutions")}
          className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors", activeTab === "institutions" ? "bg-[#6f42c1] text-white" : "text-gray-500 hover:bg-gray-100")}
        >
          Institutions
        </button>
        <button 
          onClick={() => setActiveTab("payments")}
          className={cn("px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors", activeTab === "payments" ? "bg-[#6f42c1] text-white" : "text-gray-500 hover:bg-gray-100")}
        >
          Payment Logs
        </button>
      </div>

      {activeTab === "institutions" && (
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#6f42c1]" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
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
                {tenants.map(t => {
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
                          onClick={() => setTenantToDelete(t)}
                          className="text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-md"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
                      No institutions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === "payments" && (
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#6f42c1]" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
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
                {transactions.map(t => (
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
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
                      No payment logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
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

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

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

  const handleDummyRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const regData = {
      name: formData.get('institutionName'),
      eiin: formData.get('eiin'),
      adminName: formData.get('adminName'),
      email: formData.get('email'),
      phone: formData.get('phone')
    };
    
    // Save to localStorage so it can be picked up by the auth state listener
    localStorage.setItem('pendingRegistration', JSON.stringify(regData));
    
    toast.success("Registration details saved! Please authenticate with Google to complete setup.");
    setShowRegistration(false);
    
    // Trigger Google Auth to complete the process
    handleLogin();
  };

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
            onClick={handleLogin}
            disabled={loading}
            className="w-full sm:w-auto bg-[#6f42c1] text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-[#59359a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Login
          </button>
          <button 
            onClick={() => setShowRegistration(true)}
            disabled={loading}
            className="w-full sm:w-auto bg-white text-[#6f42c1] border-2 border-[#6f42c1] px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            Registration
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

      {showRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-left relative"
          >
            <button 
              onClick={() => setShowRegistration(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-[#6f42c1] mb-6">Institution Registration</h2>
            <form onSubmit={handleDummyRegistration} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Institution Name</label>
                <input required name="institutionName" type="text" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="e.g. Dhaka College" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">EIIN Number</label>
                <input required name="eiin" type="text" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="e.g. 108363" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Admin Name</label>
                <input required name="adminName" type="text" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Email Address</label>
                <input required name="email" type="email" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="admin@institution.edu" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Phone Number</label>
                <input required name="phone" type="tel" className="w-full border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-[#6f42c1]" placeholder="01XXXXXXXXX" />
              </div>
              <button type="submit" className="w-full bg-[#6f42c1] text-white py-3 rounded-lg font-bold uppercase tracking-wider hover:bg-[#59359a] transition-colors mt-6">
                Submit Registration
              </button>
            </form>
          </motion.div>
        </div>
      )}
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

const InstitutionAdminDashboard = ({ user, tenant }: { user: UserData, tenant: Tenant | null }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Credit Balance & Recharge */}
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

      {/* Main Stats/Actions */}
      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => navigate("/reports")}
          className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#6f42c1] hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800">মোট ক্লাসের সংখ্যা</span>
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
            <span className="font-bold text-gray-800">শিক্ষকের সংখ্যা</span>
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
            <span className="font-bold text-gray-800">শিক্ষার্থীর সংখ্যা</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Settings Section */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">সেটিংস</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <button 
            onClick={() => navigate("/settings/general")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-700">প্রাথমিক সেটিংস</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => navigate("/teachers/add")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-700">শিক্ষকের তথ্য যোগ করুন</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => navigate("/students/add")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-700">শিক্ষার্থীর তথ্য যোগ করুন</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={() => navigate("/subjects/add")}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <span className="font-medium text-gray-700">বিষয় যোগ করুন</span>
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
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষক তালিকা (Teachers List)</h2>
      <Card>
        <div className="text-center py-10 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No teachers added yet.</p>
        </div>
      </Card>
    </div>
  );
};

const StudentsList = ({ user }: { user: UserData }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800">শিক্ষার্থী তালিকা (Students List)</h2>
      <Card>
        <div className="text-center py-10 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No students added yet.</p>
        </div>
      </Card>
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

    return onAuthStateChanged(auth, async (firebaseUser) => {
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
              const unsubscribe = onSnapshot(doc(db, "tenants", userData.tenant_id), (doc) => {
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
              return () => unsubscribe();
            } else {
              setLoading(false);
            }
          } else {
            // If user doesn't exist, create a default SchoolAdmin for demo
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
              role: isSuperAdmin ? "SuperAdmin" : "SchoolAdmin",
              name: pendingReg?.adminName || firebaseUser.displayName || "Admin",
              email: pendingReg?.email || firebaseUser.email || "",
              phone: pendingReg?.phone || ""
            };

            // Clear pending registration
            localStorage.removeItem('pendingRegistration');

            // In a real app, this would be handled by a registration flow
            // For this demo, we'll auto-provision
            try {
              await setDoc(doc(db, "tenants", newTenantId), newTenant);
              await setDoc(doc(db, "users", firebaseUser.uid), newUser);
              
              // Listen for tenant updates
              const unsubscribe = onSnapshot(doc(db, "tenants", newTenantId), (doc) => {
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
              return () => unsubscribe();
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
      }
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
          <Route path="/" element={
            !user ? <Login /> : 
            user.role === "SuperAdmin" ? <SuperAdminDashboard user={user} /> : 
            user.role === "SchoolAdmin" ? <InstitutionAdminDashboard user={user} tenant={tenant} /> :
            <Dashboard user={user} tenant={tenant} />
          } />
          <Route path="/scanner" element={user ? <Scanner user={user} /> : <Navigate to="/" />} />
          <Route path="/wallet" element={user ? <WalletView user={user} tenant={tenant} /> : <Navigate to="/" />} />
          <Route path="/students" element={user ? <StudentsList user={user} /> : <Navigate to="/" />} />
          <Route path="/reports" element={user ? <ReportsView user={user} /> : <Navigate to="/" />} />
          <Route path="/teachers" element={user ? <TeachersList user={user} /> : <Navigate to="/" />} />
          <Route path="/settings/general" element={user ? <GeneralSettings user={user} /> : <Navigate to="/" />} />
          <Route path="/teachers/add" element={user ? <AddTeacher user={user} /> : <Navigate to="/" />} />
          <Route path="/students/add" element={user ? <AddStudent user={user} /> : <Navigate to="/" />} />
          <Route path="/subjects/add" element={user ? <AddSubject user={user} /> : <Navigate to="/" />} />
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

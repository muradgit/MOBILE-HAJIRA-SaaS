"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { db } from "@/src/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { Tenant, Transaction, UserData } from "@/src/lib/types";
import { Card } from "@/src/components/ui/Card";
import { 
  Database, 
  History, 
  Users, 
  Wallet as WalletIcon,
  Loader2
} from "lucide-react";

export default function SuperAdminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData || userData.role !== "SuperAdmin") return;
    
    const unsubTenants = onSnapshot(query(collection(db, "tenants")), (snapshot) => {
      setTenants(snapshot.docs.map(doc => doc.data() as Tenant).filter(t => t.tenant_id !== "SUPER_ADMIN_TENANT"));
    });

    const unsubTransactions = onSnapshot(query(collection(db, "transactions")), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
    });

    const unsubUsers = onSnapshot(query(collection(db, "users"), limit(50)), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserData));
      setLoading(false);
    });

    return () => {
      unsubTenants();
      unsubTransactions();
      unsubUsers();
    };
  }, [userData]);

  if (authLoading || (userData && loading) || (!userData && !authLoading)) {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded-md w-1/4 mb-8"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-50 rounded-2xl"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-gray-50 rounded-2xl"></div>
          <div className="h-64 bg-gray-50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== "SuperAdmin") {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  const earnedMoney = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto transition-all duration-500 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-bengali">স্বাগতম, {userData.nameBN || userData.name} (Super Admin)</h1>
          <p className="text-sm text-gray-500">Manage institutions, payments, and users across the platform.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <Database className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">{tenants.length}</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Institutions</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <WalletIcon className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">৳{earnedMoney}</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold">{allUsers.length}</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Users</p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <History className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold">{transactions.length}</span>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Transactions</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Recent Institutions" icon={Database}>
          <div className="divide-y divide-gray-100">
            {tenants.slice(0, 5).map(t => (
              <div key={t.tenant_id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">EIIN: {t.eiin}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Users" icon={Users}>
          <div className="divide-y divide-gray-100">
            {allUsers.slice(0, 5).map(u => (
              <div key={u.user_id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.role} • {u.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

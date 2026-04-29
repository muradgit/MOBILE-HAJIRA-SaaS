"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { UserData, Tenant } from "@/src/lib/types";
import { useUserStore } from "@/src/store/useUserStore";

export function useAuth() {
  const [user, setUserAuth] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: userData, setUser, setTenant } = useUserStore();
  const [localTenant, setLocalTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUserAuth(firebaseUser);
      
      // Clean up previous user listener if any
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        // Initial check for existence (handling race with registration)
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
             // Handle automatic creation if missing
             const pendingDataStr = typeof window !== "undefined" ? localStorage.getItem("pendingRegistration") : null;
             const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : {};
             const role = pendingData.role || "Student";
             const tenant_id = role === "InstitutionAdmin" ? `tenant_${firebaseUser.uid}` : (pendingData.tenant_id || null);

             await setDoc(userDocRef, {
                user_id: firebaseUser.uid,
                email: firebaseUser.email,
                name: pendingData.name || firebaseUser.displayName || "New User",
                nameBN: pendingData.nameBN || "নতুন ইউজার",
                role,
                tenant_id,
                status: (role === "InstitutionAdmin" || role === "SuperAdmin") ? "approved" : "pending",
                created_at: new Date().toISOString()
             });
          }
        } catch (e) {
          console.error("Auth check error:", e);
        }

        // Setup snapshot listener for real-time sync
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            
            // CRITICAL: Master Email Check for Super Admin
            const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
            const finalRole = firebaseUser.email === superAdminEmail ? "SuperAdmin" : data.role;
            
            const resolvedUserData = { ...data, role: finalRole as any };
            setUser(resolvedUserData);
            
            if (data.tenant_id) {
              setTenant(data.tenant_id);
              const tenantDocRef = doc(db, "tenants", data.tenant_id);
              getDoc(tenantDocRef).then((tenantSnap) => {
                if (tenantSnap.exists()) {
                  setLocalTenant(tenantSnap.data() as Tenant);
                }
              });
            }
          } else {
            setUser(null);
            setTenant(null);
            setLocalTenant(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("User snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUserAuth(null);
        setUser(null);
        setTenant(null);
        setLocalTenant(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, [setUser, setTenant]);

  return { user, userData, tenant: localTenant, loading };
}

"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { UserData, Tenant } from "@/src/lib/types";
import { useUserStore } from "@/src/store/useUserStore";
import { normalizeRole, verifySuperAdmin } from "@/src/lib/auth-utils";

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
             
             // If we have pending registration data, use that role. Otherwise default.
             const role = normalizeRole(pendingData.role || "student");
             const isInstituteAdmin = role === "institute_admin";
             const tenant_id = isInstituteAdmin ? `tenant_${firebaseUser.uid}` : (pendingData.tenant_id || null);

             await setDoc(userDocRef, {
                user_id: firebaseUser.uid,
                email: firebaseUser.email,
                name: pendingData.name || firebaseUser.displayName || "New User",
                nameBN: pendingData.nameBN || "নতুন ইউজার",
                role,
                tenant_id,
                status: (isInstituteAdmin || role === "super_admin") ? "approved" : "pending",
                created_at: new Date().toISOString()
             }, { merge: true });
          }
        } catch (e) {
          console.error("Auth check error:", e);
        }

        // Setup snapshot listener for real-time sync
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            
            // CRITICAL: Resolve Role - Prioritize stored role, fallback to super_admin if email matches
            const normalizedRole = normalizeRole(data.role || (verifySuperAdmin(firebaseUser.email) ? "super_admin" : ""));
            
            const resolvedUserData = { ...data, role: normalizedRole };
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

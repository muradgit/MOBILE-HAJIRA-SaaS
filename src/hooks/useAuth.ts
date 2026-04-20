"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { UserData, Tenant } from "@/src/lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous user listener if any
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Check for pending registration data
          const pendingDataStr = localStorage.getItem("pendingRegistration");
          const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : {};

          // Create the user document with default values
          const newUserId = firebaseUser.uid;
          const tenant_id = pendingData.role === "InstitutionAdmin" ? `tenant_${newUserId}` : (pendingData.tenant_id || null);

          await setDoc(userDocRef, {
            user_id: newUserId,
            email: firebaseUser.email,
            name: pendingData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "New User",
            nameBN: pendingData.nameBN || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "নতুন ইউজার",
            profile_image: firebaseUser.photoURL,
            role: pendingData.role || "Student",
            tenant_id: tenant_id,
            status: (pendingData.role === "InstitutionAdmin" || pendingData.role === "SuperAdmin") ? "approved" : "pending",
            created_at: new Date().toISOString(),
            credits_left: 100, // Grant 100 free credits
          });

          // If InstitutionAdmin, create the tenant record as well
          if (pendingData.role === "InstitutionAdmin") {
            const tenantDocRef = doc(db, "tenants", tenant_id);
            await setDoc(tenantDocRef, {
              tenant_id: tenant_id,
              name: pendingData.institutionNameEN || pendingData.institutionName || "My Institution",
              nameBN: pendingData.institutionNameBN || "আমার প্রতিষ্ঠান",
              eiin: pendingData.eiin || "",
              credits_left: 100, // Grant 100 free credits to the tenant
              status: "active",
              owner_email: firebaseUser.email,
              admin_name: pendingData.name || firebaseUser.displayName || "",
              created_at: new Date().toISOString(),
              plan: "Free Tier"
            });
          }

          // Clear pending registration
          localStorage.removeItem("pendingRegistration");
        }

        // Setup snapshot listener for user data
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            setUserData(data);
            
            if (data.tenant_id) {
              const tenantDocRef = doc(db, "tenants", data.tenant_id);
              getDoc(tenantDocRef).then((tenantSnap) => {
                if (tenantSnap.exists()) {
                  setTenant(tenantSnap.data() as Tenant);
                }
              });
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("User snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setTenant(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  return { user, userData, tenant, loading };
}

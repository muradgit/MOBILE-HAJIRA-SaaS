"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { Layout } from "@/src/components/layout/Layout";
import { toast } from "sonner";
import { auth, db } from "@/src/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { userData, tenant, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handlePendingRegistration = async () => {
      const pendingDataStr = localStorage.getItem('pendingRegistration');
      if (pendingDataStr && auth.currentUser) {
        const pendingData = JSON.parse(pendingDataStr);
        const user = auth.currentUser;

        try {
          // Check if user already exists to avoid overwriting
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            localStorage.removeItem('pendingRegistration');
            return;
          }

          let tenantId = pendingData.tenant_id;

          // If InstitutionAdmin, create a new tenant
          if (pendingData.role === "InstitutionAdmin") {
            tenantId = `tenant_${Date.now()}`;
            await setDoc(doc(db, "tenants", tenantId), {
              tenant_id: tenantId,
              name: pendingData.institutionNameEN,
              nameBN: pendingData.institutionNameBN,
              eiin: pendingData.eiin,
              institutionType: pendingData.institutionType,
              academicLevels: pendingData.academicLevels,
              department: pendingData.department || null,
              credits_left: 50, // Initial free credits
              status: "active",
              admin_name: pendingData.name,
              admin_nameBN: pendingData.nameBN,
              admin_mobile: pendingData.phone,
              owner_email: user.email,
              created_at: new Date().toISOString(),
            });
          }

          // Create user document
          const newUser: any = {
            user_id: user.uid,
            tenant_id: tenantId,
            role: pendingData.role,
            name: pendingData.name,
            nameBN: pendingData.nameBN,
            email: user.email,
            phone: pendingData.phone,
            status: pendingData.role === "InstitutionAdmin" ? "approved" : "pending",
            created_at: new Date().toISOString(),
          };

          if (pendingData.role === "Student") {
            newUser.department = pendingData.department;
            newUser.class = pendingData.class;
            newUser.session = pendingData.session;
          } else if (pendingData.role === "Teacher") {
            newUser.department = pendingData.department || null;
          }

          await setDoc(doc(db, "users", user.uid), newUser);

          // Set session cookie
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newUser.role, userId: newUser.user_id }),
          });

          localStorage.removeItem('pendingRegistration');
          toast.success("Registration successful!");

          // Redirect based on role
          if (newUser.role === "InstitutionAdmin") {
            window.location.href = "/admin/dashboard";
          } else {
            // Teacher/Student are pending by default
            toast.info("আপনার অ্যাকাউন্টটি বর্তমানে পেন্ডিং অবস্থায় আছে। এডমিন অ্যাপ্রুভ করলে আপনি ড্যাশবোর্ড ব্যবহার করতে পারবেন।");
            window.location.href = "/auth/login";
          }
        } catch (error: any) {
          console.error("Registration error:", error);
          toast.error("Registration failed: " + error.message);
        }
      }
    };

    if (!loading && auth.currentUser) {
      handlePendingRegistration();
    }
  }, [loading]);

  return (
    <Layout user={userData} tenant={tenant}>
      {children}
    </Layout>
  );
}

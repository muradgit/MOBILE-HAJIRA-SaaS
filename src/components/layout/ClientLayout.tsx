"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/hooks/useAuth";
import { Layout } from "@/src/components/layout/Layout";
import { toast } from "sonner";
import { auth, db } from "@/src/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

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

          // Robust Role Detection
          const userEmail = user.email;
          const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
          
          let resolvedRole = pendingData.role;

          // CRITICAL: Super Admin Email ALWAYS gets SuperAdmin role
          if (userEmail === superAdminEmail) {
            resolvedRole = "SuperAdmin";
          } else if (!resolvedRole) {
            resolvedRole = "Student";
          }

          // Ensure name is never undefined
          const resolvedName = pendingData.name || user.displayName || "User";
          const resolvedNameBN = pendingData.nameBN || resolvedName;

          // Create user document
          const newUser: any = {
            user_id: user.uid,
            tenant_id: resolvedRole === "SuperAdmin" ? "SUPER_ADMIN" : tenantId,
            role: resolvedRole,
            name: resolvedName,
            nameBN: resolvedNameBN,
            email: user.email,
            phone: pendingData.phone || "",
            status: (resolvedRole === "InstitutionAdmin" || resolvedRole === "SuperAdmin") ? "approved" : "pending",
            created_at: new Date().toISOString(),
          };

          if (resolvedRole === "Student") {
            newUser.department = pendingData.department || "";
            newUser.class = pendingData.class || "";
            newUser.session = pendingData.session || "";
          } else if (resolvedRole === "Teacher") {
            newUser.department = pendingData.department || null;
          }

          await setDoc(doc(db, "users", user.uid), newUser);

          // Set session cookie - MUST happen before redirect
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newUser.role, userId: newUser.user_id }),
          });

          localStorage.removeItem('pendingRegistration');
          toast.success("Registration successful!");

          // Fixed Redirection Race Condition: Redirect only after session is set
          if (newUser.role === "SuperAdmin") {
            window.location.href = "/super-admin/dashboard";
          } else if (newUser.role === "InstitutionAdmin") {
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
      const user = auth.currentUser;
      const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";

      // CRITICAL: If this is the Super Admin email, ensure they have the correct role in Firestore
      if (user.email === superAdminEmail) {
        const userDocRef = doc(db, "users", user.uid);
        getDoc(userDocRef).then(async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.role !== "SuperAdmin") {
              await updateDoc(userDocRef, { role: "SuperAdmin", status: "approved" });
              // Refresh session cookie
              await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "SuperAdmin", userId: user.uid }),
              });
              // Redirect to Super Admin dashboard
              window.location.href = "/super-admin/dashboard";
              return;
            }
          }
        });
      }

      // Task 1: Auto-login URL Bug Fix - Redirect from root (/) to dashboard
      if (window.location.pathname === "/") {
        const userDoc = doc(db, "users", auth.currentUser.uid);
        getDoc(userDoc).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const dashboardMap: Record<string, string> = {
              SuperAdmin: "/super-admin/dashboard",
              InstitutionAdmin: "/admin/dashboard",
              Teacher: "/teacher/dashboard",
              Student: "/student/dashboard",
            };
            const redirectUrl = dashboardMap[data.role];
            if (redirectUrl) {
              window.location.href = redirectUrl;
            }
          }
        });
      }
      handlePendingRegistration();
    }
  }, [loading]);

  return (
    <Layout user={userData} tenant={tenant}>
      {children}
    </Layout>
  );
}

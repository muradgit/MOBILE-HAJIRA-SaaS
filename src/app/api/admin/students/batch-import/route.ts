import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/src/lib/firebase-admin";

/**
 * API Route: /api/admin/students/batch-import
 * Decription: Handles bulk creation of students from CSV data.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify if caller is institute_admin or teacher
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const callerData = userDoc.data();
    
    if (!callerData || !["institute_admin", "teacher", "super_admin"].includes(callerData.role)) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const tenantId = callerData.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID missing" }, { status: 400 });
    }

    // 2. Parse payload
    const { students } = await req.json();
    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No student data provided" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Firebase limits batch to 500 writes
    // But since we also do adminAuth.createUser, we should probably process them in smaller chunks or sequentially
    // for better error visibility, though batches are faster for Firestore.
    // auth.createUser is an external call, we can't batch it.

    for (const s of students) {
      try {
        let identifier = s.email?.trim();
        let identifierType = "email";

        // If no email, use shadow email based on Roll and Tenant
        if (!identifier || !identifier.includes("@")) {
          const cleanRoll = String(s.roll || Math.floor(Math.random() * 10000)).replace(/[^a-zA-Z0-9]/g, "");
          identifier = `${cleanRoll}_${tenantId}@internal.com`.toLowerCase();
          identifierType = "username";
        }

        // 3. Create Auth User
        // Check if user exists first to avoid collisions
        let authUser;
        try {
          authUser = await adminAuth.getUserByEmail(identifier);
        } catch (e: any) {
          if (e.code === "auth/user-not-found") {
            authUser = await adminAuth.createUser({
              email: identifier,
              emailVerified: true,
              password: s.password || "123456",
              displayName: s.name
            });
          } else {
            throw e;
          }
        }

        // Set Custom Claims
        await adminAuth.setCustomUserClaims(authUser.uid, { 
          role: "student",
          tenant_id: tenantId 
        });

        // 4. Create Firestore Document
        const studentData = {
          user_id: authUser.uid,
          email: identifier,
          name: s.name || "Student",
          role: "student",
          tenant_id: tenantId,
          status: "approved",
          created_at: new Date().toISOString(),
          // Extra Data
          class: String(s.academicLevel || s.class || ""),
          department: s.department || s.group || "",
          session: String(s.session || ""),
          student_id: String(s.roll || ""),
          registration_no: String(s.registrationNo || ""),
          year: String(s.year || ""),
          phone: s.mobile || s.phone || "",
          father_name: s.fatherName || "",
          mother_name: s.motherName || "",
          guardian_mobile: s.guardianMobile || "",
          imported: true
        };

        await adminDb.collection("users").doc(authUser.uid).set(studentData, { merge: true });

        // Optional: Also add to subcollection for easier lookup if needed by blueprint
        await adminDb.collection("tenants").doc(tenantId).collection("students").doc(authUser.uid).set(studentData, { merge: true });

        results.success++;
      } catch (err: any) {
        console.error(`Failed to import student ${s.name}:`, err.message);
        results.failed++;
        results.errors.push(`${s.name || "Unknown"}: ${err.message}`);
      }
    }

    // Trigger Google Sheet Sync if possible (could be done via a separate background queue or just async here)
    // We don't want to block the response for sheet sync
    
    return NextResponse.json({ 
      message: "Bulk import completed", 
      results 
    });

  } catch (error: any) {
    console.error("Bulk Import Master Error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

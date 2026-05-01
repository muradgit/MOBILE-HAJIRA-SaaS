import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "./firebase-admin";

export async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fallback: If role is missing in token, check Firestore
    if (!decodedToken.role) {
      const userRef = adminDb.collection("users").doc(decodedToken.uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        (decodedToken as any).role = userData?.role;
        (decodedToken as any).tenant_id = userData?.tenant_id;
        
        // Super Admin Bypass by email
        const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
        if (decodedToken.email === superAdminEmail && !decodedToken.role) {
          (decodedToken as any).role = "super_admin";
        }
        
        // Optionally update claims for next time (Fire and forget-ish)
        if (userData?.role || decodedToken.email === superAdminEmail) {
          adminAuth.setCustomUserClaims(decodedToken.uid, {
             role: (decodedToken as any).role,
             tenant_id: (decodedToken as any).tenant_id
          }).catch(console.error);
        }
      } else {
         // Special case for initial super admin if no doc exists yet
         const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "hello@muradkhank31.com";
         if (decodedToken.email === superAdminEmail) {
           (decodedToken as any).role = "super_admin";
         }
      }
    }
    
    return decodedToken;
  } catch (error) {
    return null;
  }
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function successResponse(data: any) {
  return NextResponse.json(data);
}

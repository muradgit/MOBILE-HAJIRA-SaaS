/**
 * Single Source of Truth for Role Normalization and Super Admin Verification
 */

export const SUPER_ADMIN_EMAILS = ["hello@muradkhank31.com", "muradkhan31@gmail.com"];

export type UserRole = 'super_admin' | 'institute_admin' | 'teacher' | 'student';

/**
 * Rigorously maps all variant role strings to the strict system roles.
 */
export function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'student'; // Default fallback
  
  const r = role.toLowerCase().replace(/[\s-_]/g, "");
  
  if (r === "superadmin" || r === "super_admin") return "super_admin";
  if (r === "instituteadmin" || r === "institutionadmin" || r === "admin" || r === "institute_admin") return "institute_admin";
  if (r === "teacher") return "teacher";
  if (r === "student") return "student";
  
  return "student"; // Default for unknown roles
}

/**
 * Verifies if an email is authorized for Super Admin access.
 */
export function verifySuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

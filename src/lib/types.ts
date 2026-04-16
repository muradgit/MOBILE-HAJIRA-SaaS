export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export interface Tenant {
  tenant_id: string;
  name: string;
  eiin: string;
  credits_left: number;
  googleSheetId: string;
  promo_code: string;
  referral_count: number;
  status?: "active" | "suspended" | "deactivated";
  plan?: "Free Tier" | "Paid";
  class_duration?: number;
  total_credit_used?: number;
  total_credit_purchased?: number;
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
  institutionType?: "College" | "School" | "Madrasa" | "Coaching Center";
  departmentName?: string;
}

export interface UserData {
  user_id: string;
  tenant_id: string;
  role: "SuperAdmin" | "InstitutionAdmin" | "Teacher" | "Student";
  name: string;
  email?: string;
  phone?: string;
  student_id?: string;
  teacher_id?: string;
  class?: string;
  section?: string;
  subject?: string;
  profile_image?: string;
  created_at?: string;
  status?: "pending" | "approved";
}

export interface Course {
  course_id: string;
  tenant_id: string;
  name: string;
  code: string;
  teacher_id: string;
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  teacher_id: string;
  subject: string;
  timestamp: string;
  status: "present" | "absent";
}

export interface Transaction {
  trx_id: string;
  amount: number;
  sender_number: string;
  status: "unused" | "used";
  claimed_by_tenant: string;
  timestamp: string;
}

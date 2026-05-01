import { create } from "zustand";
import { UserData } from "@/src/lib/types";
import { normalizeRole } from "@/src/lib/auth-utils";

interface UserStoreState {
  user: UserData | null;
  userRole: string | null;
  activeRole: string | null; // The role currently being used for UI
  tenantId: string | null;
  creditBalance: number;
  isInitialized: boolean;
  setUser: (user: UserData | null) => void;
  setRole: (role: string | null) => void;
  setActiveRole: (role: string | null) => void;
  setTenant: (tenantId: string | null) => void;
  setCredits: (credits: number) => void;
  logout: () => void;
}

/**
 * Global User Store for MOBILE-HAJIRA-SaaS
 * Manages user session, roles, tenant context, and credits.
 */
export const useUserStore = create<UserStoreState>((set) => ({
  user: null,
  userRole: null,
  activeRole: null,
  tenantId: null,
  creditBalance: 0,
  isInitialized: false,

  setUser: (user) => set((state) => {
    const isSameUser = state.user?.user_id === user?.user_id;
    const normalizedRole = normalizeRole(user?.role);
    return { 
      user: user ? { ...user, role: normalizedRole } : null, 
      userRole: normalizedRole, 
      // Only set activeRole from user.role if it's a new user login or was null
      activeRole: isSameUser ? (state.activeRole || normalizedRole) : normalizedRole,
      tenantId: user?.tenant_id || null,
      isInitialized: true 
    };
  }),

  setRole: (role) => set({ userRole: normalizeRole(role) }),
  setActiveRole: (activeRole) => set({ activeRole: normalizeRole(activeRole) }),

  setTenant: (tenantId) => set({ tenantId }),

  setCredits: (creditBalance) => set({ creditBalance }),

  logout: () => set({ 
    user: null, 
    userRole: null, 
    activeRole: null, 
    tenantId: null, 
    creditBalance: 0, 
    isInitialized: false 
  }),
}));

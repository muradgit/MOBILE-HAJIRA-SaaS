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
    
    // Attempt to recover activeRole from localStorage if it's the same user or first load
    let persistedActiveRole = null;
    if (typeof window !== "undefined") {
      persistedActiveRole = localStorage.getItem(`activeRole_${user?.user_id}`);
    }

    const nextActiveRole = isSameUser 
      ? (state.activeRole || persistedActiveRole || normalizedRole) 
      : (persistedActiveRole || normalizedRole);

    return { 
      user: user ? { ...user, role: normalizedRole } : null, 
      userRole: normalizedRole, 
      activeRole: nextActiveRole,
      tenantId: user?.tenant_id || null,
      isInitialized: true 
    };
  }),

  setRole: (role) => set({ userRole: normalizeRole(role) }),
  setActiveRole: (activeRole) => set((state) => {
    const role = normalizeRole(activeRole);
    if (typeof window !== "undefined" && state.user?.user_id) {
       localStorage.setItem(`activeRole_${state.user.user_id}`, role || "");
    }
    return { activeRole: role };
  }),

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

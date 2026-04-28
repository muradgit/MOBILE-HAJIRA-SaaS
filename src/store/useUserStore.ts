import { create } from "zustand";
import { UserData } from "@/src/lib/types";

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

  setUser: (user) => set({ 
    user, 
    userRole: user?.role || null, 
    activeRole: user?.role || null,
    tenantId: user?.tenant_id || null,
    isInitialized: true 
  }),

  setRole: (role) => set({ userRole: role }),
  setActiveRole: (activeRole) => set({ activeRole }),

  setTenant: (tenantId) => set({ tenantId }),

  setCredits: (creditBalance) => set({ creditBalance }),

  logout: () => set({ 
    user: null, 
    userRole: null, 
    tenantId: null, 
    creditBalance: 0, 
    isInitialized: false 
  }),
}));

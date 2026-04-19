import { create } from "zustand";
import { UserData } from "@/src/lib/types";

interface UserStoreState {
  user: UserData | null;
  userRole: string | null;
  tenantId: string | null;
  creditBalance: number;
  isInitialized: boolean;
  setUser: (user: UserData | null) => void;
  setRole: (role: string | null) => void;
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
  tenantId: null,
  creditBalance: 0,
  isInitialized: false,

  setUser: (user) => set({ 
    user, 
    userRole: user?.role || null, 
    tenantId: user?.tenant_id || null,
    isInitialized: true 
  }),

  setRole: (role) => set({ userRole: role }),

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

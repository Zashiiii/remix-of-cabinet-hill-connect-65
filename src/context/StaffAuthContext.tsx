import React, { createContext, useContext, ReactNode } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface StaffAuthContextType {
  user: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  extendSession: () => Promise<void>;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const StaffAuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useStaffAuth();

  return (
    <StaffAuthContext.Provider value={auth}>
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuthContext = () => {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuthContext must be used within a StaffAuthProvider');
  }
  return context;
};

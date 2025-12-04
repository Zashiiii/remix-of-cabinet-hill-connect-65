import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface StaffAuthState {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
}

const STORAGE_KEY = 'bris_staff_session';
const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry

// Synchronous initial state check - prevents race conditions
const getInitialState = (): StaffAuthState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        console.log('Initial session loaded from localStorage, user:', session.user?.username);
        return {
          user: session.user,
          token: session.token,
          isAuthenticated: true,
          isLoading: false,
          expiresAt: new Date(session.expiresAt),
        };
      }
      // Session expired - clean up
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error reading initial session:', error);
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    expiresAt: null,
  };
};

export const useStaffAuth = () => {
  // Initialize with synchronous check - no loading state flicker
  const [authState, setAuthState] = useState<StaffAuthState>(getInitialState);

  // Ref to track if we've already initialized listeners
  const initializedRef = useRef(false);
  // Ref to track ongoing validation
  const validatingRef = useRef(false);
  // Ref for warning toast shown
  const warningShownRef = useRef(false);
  // Ref to store timer
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set up session expiration warning
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) {
      // Clear any existing timer
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      warningShownRef.current = false;
      return;
    }

    const checkExpiration = () => {
      if (!authState.expiresAt) return;
      
      const now = new Date();
      const timeUntilExpiry = authState.expiresAt.getTime() - now.getTime();

      // Session already expired
      if (timeUntilExpiry <= 0) {
        toast.error('Your session has expired. Please login again.', {
          duration: 5000,
        });
        localStorage.removeItem(STORAGE_KEY);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          expiresAt: null,
        });
        return;
      }

      // Show warning if within threshold and not already shown
      if (timeUntilExpiry <= WARNING_THRESHOLD_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        const minutesLeft = Math.ceil(timeUntilExpiry / 60000);
        
        toast.warning(`Your session will expire in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`, {
          duration: 10000,
          action: {
            label: 'Extend Session',
            onClick: () => extendSession(),
          },
        });
      }

      // Schedule next check
      const nextCheckIn = Math.min(timeUntilExpiry - WARNING_THRESHOLD_MS, 60000);
      if (nextCheckIn > 0) {
        warningTimerRef.current = setTimeout(checkExpiration, nextCheckIn);
      } else {
        // Check more frequently when close to expiry
        warningTimerRef.current = setTimeout(checkExpiration, 30000);
      }
    };

    checkExpiration();

    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [authState.isAuthenticated, authState.expiresAt]);

  // Extend session by re-validating
  const extendSession = useCallback(async () => {
    if (!authState.token) return;

    try {
      const response = await supabase.functions.invoke('staff-auth', {
        body: { action: 'extend', token: authState.token },
      });

      if (response.data?.success && response.data?.expiresAt) {
        const newExpiresAt = new Date(response.data.expiresAt);
        
        // Update localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session = JSON.parse(stored);
          session.expiresAt = response.data.expiresAt;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }

        // Update state
        setAuthState(prev => ({
          ...prev,
          expiresAt: newExpiresAt,
        }));

        warningShownRef.current = false;
        toast.success('Session extended successfully');
      } else {
        toast.error('Failed to extend session. Please login again.');
      }
    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('Failed to extend session');
    }
  }, [authState.token]);

  // Set up storage listener for multi-tab support
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const session = JSON.parse(e.newValue);
            if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
              setAuthState({
                user: session.user,
                token: session.token,
                isAuthenticated: true,
                isLoading: false,
                expiresAt: new Date(session.expiresAt),
              });
              warningShownRef.current = false;
            }
          } catch {
            // Invalid session
          }
        } else {
          // Session was cleared
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            expiresAt: null,
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Validate session with server (called periodically or on demand)
  const validateSession = useCallback(async (token: string): Promise<boolean> => {
    if (validatingRef.current) return true;
    validatingRef.current = true;

    try {
      console.log('Validating session with server...');
      const response = await supabase.functions.invoke('staff-auth', {
        body: { action: 'validate', token },
      });

      console.log('Validation response:', response);
      
      if (response.error) {
        console.error('Validation error:', response.error);
        return false;
      }

      return response.data?.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    } finally {
      validatingRef.current = false;
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      console.log('Attempting login for:', username);
      
      const { data, error } = await supabase.functions.invoke('staff-auth', {
        body: { action: 'login', username, password },
      });

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login invoke error:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { success: false, error: data.error, code: data.code };
      }

      if (!data?.success || !data?.token || !data?.user) {
        return { success: false, error: 'Invalid response from server' };
      }

      const session = {
        user: data.user,
        token: data.token,
        expiresAt: data.expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      setAuthState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        expiresAt: new Date(data.expiresAt),
      });

      warningShownRef.current = false;
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authState.token) {
        console.log('Logging out with token...');
        await supabase.functions.invoke('staff-auth?action=logout', {
          body: { action: 'logout', token: authState.token },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        expiresAt: null,
      });
    }
  }, [authState.token]);

  return {
    ...authState,
    login,
    logout,
    validateSession,
    extendSession,
  };
};

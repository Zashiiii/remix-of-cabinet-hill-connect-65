import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
}

const STORAGE_KEY = 'bris_staff_session';

export const useStaffAuth = () => {
  const [authState, setAuthState] = useState<StaffAuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Ref to track if we've already initialized
  const initializedRef = useRef(false);
  // Ref to track ongoing validation
  const validatingRef = useRef(false);

  // Load session from localStorage on mount - no validation needed for navigation
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loadSession = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session = JSON.parse(stored);
          
          // Check if session has expired locally
          if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
            console.log('Session loaded from localStorage, user:', session.user?.username);
            setAuthState({
              user: session.user,
              token: session.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Session expired
            console.log('Session expired, clearing...');
            localStorage.removeItem(STORAGE_KEY);
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadSession();

    // Listen for storage events (for multi-tab support)
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
              });
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
      });

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
        // Pass action as URL param for reliability
        await supabase.functions.invoke('staff-auth?action=logout', {
          body: { action: 'logout', token: authState.token },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, [authState.token]);

  return {
    ...authState,
    login,
    logout,
    validateSession,
  };
};

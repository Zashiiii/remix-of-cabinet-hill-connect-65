import { useState, useEffect, useCallback } from 'react';
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

  // Validate session using supabase.functions.invoke
  const validateSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      console.log('Validating session...');
      const { data, error } = await supabase.functions.invoke('staff-auth', {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // The function doesn't support query params via invoke, so we need to use fetch
      // but let's try with a different approach - pass action in body
      const response = await supabase.functions.invoke('staff-auth?action=validate', {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    }
  }, []);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session = JSON.parse(stored);
          
          // Validate the session with the server
          const isValid = await validateSession(session.token);
          
          if (isValid) {
            setAuthState({
              user: session.user,
              token: session.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Session expired or invalid
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
  }, [validateSession]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Attempting login for:', username);
      
      const { data, error } = await supabase.functions.invoke('staff-auth?action=login', {
        body: { username, password },
      });

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login invoke error:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { success: false, error: data.error };
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
        console.log('Logging out...');
        await supabase.functions.invoke('staff-auth?action=logout', {
          body: { token: authState.token },
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

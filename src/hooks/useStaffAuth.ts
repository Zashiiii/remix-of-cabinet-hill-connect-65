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
  }, []);

  const validateSession = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('staff-auth', {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check URL params for action=validate
      const response = await fetch(
        `https://cdkfweqmzdrozhttmcao.supabase.co/functions/v1/staff-auth?action=validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        `https://cdkfweqmzdrozhttmcao.supabase.co/functions/v1/staff-auth?action=login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return { success: false, error: data.error || 'Login failed' };
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
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authState.token) {
        await fetch(
          `https://cdkfweqmzdrozhttmcao.supabase.co/functions/v1/staff-auth?action=logout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: authState.token }),
          }
        );
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

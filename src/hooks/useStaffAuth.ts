import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface StaffAuthState {
  user: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
}

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const STORAGE_KEY = 'bris_staff_session';

// Helper function to call staff-auth edge function
const callStaffAuthFunction = async (body: Record<string, unknown>): Promise<{ data: any; error: any }> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/staff-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: { message: data.error || 'Request failed' } };
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: 'Network error' } };
  }
};

// Get stored token from localStorage
const getStoredToken = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Check if token is expired
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
};

// Store token in localStorage
const storeToken = (token: string, expiresAt: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt }));
  } catch (error) {
    console.error('Failed to store session token:', error);
  }
};

// Clear stored token
const clearStoredToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session token:', error);
  }
};

export const useStaffAuth = () => {
  const [authState, setAuthState] = useState<StaffAuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    expiresAt: null,
  });

  const initializedRef = useRef(false);
  const warningShownRef = useRef(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check session on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const checkSession = async () => {
      try {
        const storedToken = getStoredToken();
        console.log('Checking session - stored token present:', !!storedToken);
        
        if (!storedToken) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            expiresAt: null,
          });
          return;
        }

        const { data, error } = await callStaffAuthFunction({ 
          action: 'get-session',
          token: storedToken 
        });
        
        if (error) {
          console.log('Session check error:', error);
          clearStoredToken();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            expiresAt: null,
          });
          return;
        }

        if (data?.authenticated && data?.user) {
          console.log('Session valid, user:', data.user.username);
          setAuthState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          });
        } else {
          console.log('No valid session found');
          clearStoredToken();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            expiresAt: null,
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
        clearStoredToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          expiresAt: null,
        });
      }
    };

    checkSession();
  }, []);

  // Set up session expiration warning
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) {
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

      if (timeUntilExpiry <= 0) {
        toast.error('Your session has expired. Please login again.', {
          duration: 5000,
        });
        clearStoredToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          expiresAt: null,
        });
        return;
      }

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

      const nextCheckIn = Math.min(timeUntilExpiry - WARNING_THRESHOLD_MS, 60000);
      if (nextCheckIn > 0) {
        warningTimerRef.current = setTimeout(checkExpiration, nextCheckIn);
      } else {
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

  const extendSession = useCallback(async () => {
    try {
      const storedToken = getStoredToken();
      const { data, error } = await callStaffAuthFunction({ 
        action: 'extend',
        token: storedToken 
      });

      if (data?.success && data?.expiresAt) {
        const newExpiresAt = new Date(data.expiresAt);
        
        // Update stored token expiry
        if (storedToken) {
          storeToken(storedToken, data.expiresAt);
        }
        
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
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const storedToken = getStoredToken();
      if (!storedToken) return false;
      
      console.log('Validating session with server...');
      const { data, error } = await callStaffAuthFunction({ 
        action: 'validate',
        token: storedToken 
      });

      console.log('Validation response:', { data, error });
      
      if (error) {
        console.error('Validation error:', error);
        return false;
      }

      return data?.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      console.log('Attempting login for:', username);
      
      const { data, error } = await callStaffAuthFunction({ 
        action: 'login', 
        username, 
        password 
      });

      console.log('Login response:', { data, error });

      if (error) {
        console.error('Login invoke error:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { success: false, error: data.error, code: data.code };
      }

      if (!data?.success || !data?.user || !data?.token) {
        return { success: false, error: 'Invalid response from server' };
      }

      // Store token in localStorage
      storeToken(data.token, data.expiresAt);

      setAuthState({
        user: data.user,
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
      console.log('Logging out...');
      const storedToken = getStoredToken();
      await callStaffAuthFunction({ 
        action: 'logout',
        token: storedToken 
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      clearStoredToken();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        expiresAt: null,
      });
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    validateSession,
    extendSession,
  };
};

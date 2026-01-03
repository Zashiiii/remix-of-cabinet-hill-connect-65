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

// Helper function to call staff-auth edge function
// Session tokens are managed via httpOnly cookies - no token in request body
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
      credentials: 'include', // Important: sends httpOnly cookies
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

  // Check session on mount using httpOnly cookie
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const checkSession = async () => {
      try {
        console.log('Checking session via httpOnly cookie...');
        
        // Call get-session - the server will read the httpOnly cookie
        const { data, error } = await callStaffAuthFunction({ 
          action: 'get-session'
        });
        
        if (error) {
          console.log('Session check error:', error);
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
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            expiresAt: null,
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
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
      // Session token is in httpOnly cookie - no need to send it
      const { data, error } = await callStaffAuthFunction({ 
        action: 'extend'
      });

      if (data?.success && data?.expiresAt) {
        const newExpiresAt = new Date(data.expiresAt);
        
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
      console.log('Validating session with server...');
      // Session token is in httpOnly cookie - no need to send it
      const { data, error } = await callStaffAuthFunction({ 
        action: 'validate'
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

      console.log('Login response:', { data: data ? { ...data, token: '[REDACTED]' } : null, error });

      if (error) {
        console.error('Login invoke error:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      if (data?.error) {
        return { success: false, error: data.error, code: data.code };
      }

      if (!data?.success || !data?.user) {
        return { success: false, error: 'Invalid response from server' };
      }

      // Token is now set via httpOnly cookie by the server - no localStorage needed
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
      // Session token is in httpOnly cookie - server will clear it
      await callStaffAuthFunction({ 
        action: 'logout'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
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

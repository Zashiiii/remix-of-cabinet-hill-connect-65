import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useResidentAuth } from '@/hooks/useResidentAuth';
import { useStaffAuthContext } from '@/context/StaffAuthContext';
import { Loader2, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { hasPermission, FeatureKey } from '@/utils/rolePermissions';
import { isStaffForcedLogout, isResidentForcedLogout } from '@/utils/authNavigationGuard';

interface StaffProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'staff' | 'admin' | 'any';
  allowedRoles?: string[]; // Array of specific roles allowed
  requiredFeature?: FeatureKey; // Feature-based access control
  redirectTo?: string;
}

interface ResidentProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

// Protected route for staff/admin pages
export const StaffProtectedRoute = ({ 
  children, 
  requiredRole = 'any',
  allowedRoles,
  requiredFeature,
  redirectTo = '/' 
}: StaffProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, validateSession, logout } = useStaffAuthContext();
  const location = useLocation();
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(true);
  const [forcedLogout, setForcedLogout] = useState(() => isStaffForcedLogout());

  // Re-check forced logout flag on every navigation change
  useEffect(() => {
    setForcedLogout(isStaffForcedLogout());
  }, [location.key]);

  // Also listen for popstate to catch browser back/forward
  useEffect(() => {
    const checkForcedLogout = () => {
      if (isStaffForcedLogout()) {
        setForcedLogout(true);
      }
    };
    window.addEventListener('popstate', checkForcedLogout);
    return () => window.removeEventListener('popstate', checkForcedLogout);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const revalidate = async () => {
      if (isLoading) return;

      if (!isAuthenticated || isStaffForcedLogout()) {
        if (isMounted) {
          setForcedLogout(isStaffForcedLogout());
          setIsSessionValid(false);
          setIsRevalidating(false);
        }
        return;
      }

      setIsRevalidating(true);
      const valid = await validateSession();

      if (!isMounted) return;

      setIsSessionValid(valid);
      setIsRevalidating(false);

      if (!valid) {
        await logout();
      }
    };

    revalidate();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading, validateSession, logout, location.key]);

  // Check forced logout synchronously on every render — not through state
  if (isStaffForcedLogout()) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (forcedLogout) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (isLoading || isRevalidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isSessionValid) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check feature-based permission
  if (requiredFeature && !hasPermission(user?.role, requiredFeature)) {
    return <Navigate to="/staff-dashboard" replace />;
  }

  // Check specific allowed roles
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/staff-dashboard" replace />;
  }

  // Legacy role check for admin-only routes
  if (requiredRole === 'admin' && user?.role !== 'admin' && user?.role !== 'barangay_captain') {
    return <Navigate to="/staff-dashboard" replace />;
  }

  return <>{children}</>;
};

// Protected route for resident pages (uses Supabase auth)
export const ResidentProtectedRoute = ({ 
  children, 
  redirectTo = '/auth' 
}: ResidentProtectedRouteProps) => {
  const { isAuthenticated, isLoading, profile } = useResidentAuth();
  const location = useLocation();
  
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const [isSessionVerified, setIsSessionVerified] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const [forcedLogout, setForcedLogout] = useState(() => isResidentForcedLogout());

  // Re-check forced logout flag on navigation changes
  useEffect(() => {
    setForcedLogout(isResidentForcedLogout());
  }, [location.key]);

  useEffect(() => {
    const checkForcedLogout = () => {
      if (isResidentForcedLogout()) {
        setForcedLogout(true);
      }
    };
    window.addEventListener('popstate', checkForcedLogout);
    return () => window.removeEventListener('popstate', checkForcedLogout);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (isLoading) return;

      // Check forced logout before any session verification
      if (isResidentForcedLogout()) {
        if (isMounted) {
          setForcedLogout(true);
          setHasValidSession(false);
          setIsSessionVerified(true);
        }
        return;
      }

      if (!isAuthenticated) {
        if (isMounted) {
          setHasValidSession(false);
          setIsSessionVerified(true);
        }
        return;
      }

      setIsSessionVerified(false);
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;
      
      // Re-check after async call
      if (isResidentForcedLogout()) {
        setForcedLogout(true);
        setHasValidSession(false);
        setIsSessionVerified(true);
        return;
      }

      setHasValidSession(!!session?.user);
      setIsSessionVerified(true);
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading, location.key]);

  useEffect(() => {
    // Skip if still loading auth state or validating session
    if (isLoading || !isSessionVerified) {
      return;
    }

    // If not authenticated or session invalid, stop checking
    if (!isAuthenticated || !hasValidSession) {
      setIsCheckingApproval(false);
      return;
    }

    // If profile has approval status, use it directly (no async needed)
    if (profile?.approvalStatus) {
      setApprovalStatus(profile.approvalStatus);
      setIsCheckingApproval(false);
      setHasCheckedOnce(true);
      return;
    }

    // Only fetch from database once if profile doesn't have status yet
    if (hasCheckedOnce) {
      return;
    }

    const checkApprovalStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: resident } = await supabase
          .from("residents")
          .select("approval_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (resident) {
          setApprovalStatus(resident.approval_status);
        } else {
          // Try by email
          const { data: residentByEmail } = await supabase
            .from("residents")
            .select("approval_status")
            .eq("email", user.email)
            .maybeSingle();
          
          setApprovalStatus(residentByEmail?.approval_status || null);
        }
      }
      setIsCheckingApproval(false);
      setHasCheckedOnce(true);
    };

    checkApprovalStatus();
  }, [isAuthenticated, isLoading, isSessionVerified, hasValidSession, profile?.approvalStatus, hasCheckedOnce]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth');
  };

  // Forced logout check — catches browser back/forward immediately
  if (forcedLogout) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Show loading while checking auth/session/approval status
  if (isLoading || !isSessionVerified || isCheckingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated or stale session - redirect to auth page
  if (!isAuthenticated || !hasValidSession) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Show pending approval message
  if (approvalStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Account Pending Approval
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your registration is awaiting admin approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Your account has been registered but is pending approval from the Barangay admin. 
                This usually takes 1-2 business days. You will be able to access your dashboard once approved.
              </p>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              You may contact the Barangay office for faster processing or check your status on the login page.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show rejected message
  if (approvalStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Registration Rejected
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your account registration was not approved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Unfortunately, your registration was rejected by the Barangay admin. 
                Please contact the Barangay office for more information about why your registration was rejected 
                and how you can resolve this.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only allow access if approved
  if (approvalStatus !== 'approved') {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useResidentAuth } from '@/hooks/useResidentAuth';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { Loader2, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface StaffProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'staff' | 'admin' | 'any';
  redirectTo?: string;
}

interface ResidentProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

// Protected route for staff/admin pages - uses hook directly to avoid context issues
export const StaffProtectedRoute = ({ 
  children, 
  requiredRole = 'any',
  redirectTo = '/' 
}: StaffProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useStaffAuth();
  const location = useLocation();

  // Show loading only if actually loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to home
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role check for admin-only routes
  if (requiredRole === 'admin' && user?.role !== 'admin') {
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
  const navigate = useNavigate();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!isAuthenticated || isLoading) {
        setIsCheckingApproval(false);
        return;
      }

      // If profile has approval status, use it
      if (profile?.approvalStatus) {
        setApprovalStatus(profile.approvalStatus);
        setIsCheckingApproval(false);
        return;
      }

      // Otherwise fetch from database
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
    };

    checkApprovalStatus();
  }, [isAuthenticated, isLoading, profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Show loading while checking Supabase auth or approval status
  if (isLoading || isCheckingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to auth page
  if (!isAuthenticated) {
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

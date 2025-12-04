import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuthContext } from '@/context/StaffAuthContext';
import { useResidentAuth } from '@/hooks/useResidentAuth';
import { Loader2 } from 'lucide-react';

interface StaffProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'staff' | 'admin' | 'any';
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
  redirectTo = '/' 
}: StaffProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useStaffAuthContext();
  const location = useLocation();

  // Show loading only if actually loading (shouldn't happen with sync init)
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
  const { isAuthenticated, isLoading } = useResidentAuth();
  const location = useLocation();

  // Show loading while checking Supabase auth
  if (isLoading) {
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

  return <>{children}</>;
};

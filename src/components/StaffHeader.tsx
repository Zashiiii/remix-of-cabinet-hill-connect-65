import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun, ArrowLeft, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useTheme } from "@/components/theme-provider";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { toast } from "sonner";

const StaffHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useStaffAuthContext();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleBackToDashboard = () => {
    navigate("/staff-dashboard");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border shadow-soft">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Barangay Salud Mitra Logo" 
              className="h-10 w-10"
            />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-primary leading-tight">
                Barangay Salud Mitra
              </h1>
              <p className="text-xs text-muted-foreground">Baguio City</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/') && !isActive('/staff-dashboard')
                  ? 'bg-active-nav text-active-nav-foreground' 
                  : 'text-foreground hover:text-primary'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/request-certificate" 
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/request-certificate') 
                  ? 'bg-active-nav text-active-nav-foreground' 
                  : 'text-foreground hover:text-primary'
              }`}
            >
              Request Certificate
            </Link>
            <Link 
              to="/track-request" 
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/track-request') 
                  ? 'bg-active-nav text-active-nav-foreground' 
                  : 'text-foreground hover:text-primary'
              }`}
            >
              Track Request Status
            </Link>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Logged in as</span>
              <span className="font-medium text-foreground">{user?.fullName}</span>
            </div>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleBackToDashboard}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border pb-4">
                Logged in as <span className="font-medium text-foreground">{user?.fullName}</span>
              </div>
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors py-2 px-3 rounded-md ${
                  isActive('/') && !isActive('/staff-dashboard')
                    ? 'bg-active-nav text-active-nav-foreground' 
                    : 'text-foreground hover:text-primary'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/request-certificate" 
                className={`text-sm font-medium transition-colors py-2 px-3 rounded-md ${
                  isActive('/request-certificate') 
                    ? 'bg-active-nav text-active-nav-foreground' 
                    : 'text-foreground hover:text-primary'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Request Certificate
              </Link>
              <Link 
                to="/track-request" 
                className={`text-sm font-medium transition-colors py-2 px-3 rounded-md ${
                  isActive('/track-request') 
                    ? 'bg-active-nav text-active-nav-foreground' 
                    : 'text-foreground hover:text-primary'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Track Request Status
              </Link>
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleBackToDashboard();
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default StaffHeader;

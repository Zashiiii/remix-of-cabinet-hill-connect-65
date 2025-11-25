import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/logo.png";
import StaffLoginModal from "@/components/StaffLoginModal";
import { useTheme } from "@/components/theme-provider";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
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
                isActive('/') 
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
            <a 
              href="#contact" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md"
              onClick={(e) => {
                e.preventDefault();
                if (window.location.pathname === '/') {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.location.href = '/#contact';
                }
              }}
            >
              Contact
            </a>
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setStaffLoginOpen(true)}
            >
              Staff Login
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
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors py-2 px-3 rounded-md ${
                  isActive('/') 
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
              <a 
                href="#contact" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2 px-3 rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (window.location.pathname === '/') {
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.location.href = '/#contact';
                  }
                }}
              >
                Contact
              </a>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1"
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
                  className="flex-[3]"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setStaffLoginOpen(true);
                  }}
                >
                  Staff Login
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <StaffLoginModal open={staffLoginOpen} onOpenChange={setStaffLoginOpen} />
    </header>
  );
};

export default Header;

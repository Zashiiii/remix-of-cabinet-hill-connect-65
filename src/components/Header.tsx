import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import StaffLoginModal from "@/components/StaffLoginModal";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border shadow-soft">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Barangay Cabinet Hill Logo" 
              className="h-10 w-10"
            />
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-primary leading-tight">
                Barangay Cabinet Hill
              </h1>
              <p className="text-xs text-muted-foreground">Baguio City</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            <Link 
              to="/" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/#services" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Services
            </Link>
            <Link 
              to="/#contact" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
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
                className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/#services" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/#contact" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setStaffLoginOpen(true);
                }}
              >
                Staff Login
              </Button>
            </div>
          </div>
        )}
      </nav>
      <StaffLoginModal open={staffLoginOpen} onOpenChange={setStaffLoginOpen} />
    </header>
  );
};

export default Header;

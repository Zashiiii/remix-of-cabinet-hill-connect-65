import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Quick Links */}
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm opacity-90 hover:opacity-100 transition-opacity">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm opacity-90 hover:opacity-100 transition-opacity">
              Terms of Service
            </Link>
          </div>
          
          {/* Copyright */}
          <div className="text-sm opacity-90">
            <p>&copy; 2024 Barangay Salud Mitra. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
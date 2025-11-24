const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-8 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-center md:text-left">
            © 2024 Barangay Salud Mitra. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a 
              href="#privacy" 
              className="text-sm hover:text-accent transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="#terms" 
              className="text-sm hover:text-accent transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

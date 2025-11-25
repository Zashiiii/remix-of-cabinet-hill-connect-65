import { MapPin, Phone, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-12 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left Side - Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-4">Contact Information</h3>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold">Address</p>
                <p className="text-sm opacity-90">
                  Barangay Salud Mitra<br />
                  Baguio City, Benguet
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold">Telephone</p>
                <p className="text-sm opacity-90">
                  (074) 442-7763 / (074) 442-5544
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold">Office Hours</p>
                <p className="text-sm opacity-90">
                  Monday - Friday<br />
                  8:00 AM - 5:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <a 
                href="#privacy" 
                className="text-sm hover:text-accent transition-colors inline-block"
              >
                Privacy Policy
              </a>
              <a 
                href="#terms" 
                className="text-sm hover:text-accent transition-colors inline-block"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-primary-foreground/20 text-center">
          <p className="text-sm opacity-90">
            © 2024 Barangay Salud Mitra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

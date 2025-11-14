import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section 
      id="home" 
      className="relative min-h-[600px] flex items-center bg-primary"
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75"></div>
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Barangay Cabinet Hill
            <span className="block text-accent mt-2">
              Resident Information System
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl">
            Efficient, Transparent, and Accessible Barangay Services
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/request-certificate">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-medium w-full sm:w-auto"
              >
                <FileText className="mr-2 h-5 w-5" />
                Request Certificate
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
            >
              <Search className="mr-2 h-5 w-5" />
              Track Request Status
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

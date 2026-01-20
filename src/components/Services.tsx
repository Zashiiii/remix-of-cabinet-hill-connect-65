import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search, FileText, AlertTriangle, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

const services = [
  {
    icon: FileText,
    title: "Request Certificate",
    description: "Request barangay certificates online (registration required)",
    path: "/request-certificate",
  },
  {
    icon: AlertTriangle,
    title: "Incident / Blotter",
    description: "Report incidents or file blotter records (registration required)",
    path: "/auth",
  },
  {
    icon: ClipboardList,
    title: "Barangay Census",
    description: "Submit household ecological profile data (registration required)",
    path: "/auth",
  },
  {
    icon: UserPlus,
    title: "Resident Registration",
    description: "Register or update your information at the barangay",
    path: "/auth",
  },
  {
    icon: Search,
    title: "Track Requests",
    description: "Monitor your certificate request status in real-time",
    path: "/track-request",
  },
];

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Convenient and accessible barangay services for all residents
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg hover:scale-105 transition-all duration-300 border-border bg-card cursor-pointer"
              onClick={() => navigate(service.path)}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

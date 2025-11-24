import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail } from "lucide-react";

const contactInfo = [
  {
    icon: Clock,
    label: "Office Hours",
    value: "Monday-Friday, 8:00 AM - 5:00 PM",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Barangay Salud Mitra, Baguio City, Philippines",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(074) 123-4567",
  },
  {
    icon: Mail,
    label: "Email",
    value: "saludmitrabrgy@baguio.gov.ph",
  },
];

const Information = () => {
  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Contact Information
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get in touch with Barangay Salud Mitra
          </p>
        </div>

        <Card className="max-w-4xl mx-auto shadow-medium">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <info.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {info.label}
                    </h3>
                    <p className="text-muted-foreground">{info.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Information;

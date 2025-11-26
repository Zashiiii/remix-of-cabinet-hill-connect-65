import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import GoogleMap from "@/components/GoogleMap";
import Officials from "@/components/Officials";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail } from "lucide-react";

const contactInfo = [
  {
    icon: Phone,
    label: "Main Office",
    value: "(074) 442-5376",
  },
  {
    icon: Phone,
    label: "Emergency Hotline",
    value: "(074) 442-8888",
  },
  {
    icon: Mail,
    label: "Email Address",
    value: "saludmitrabrgy@baguio.gov.ph",
  },
  {
    icon: Clock,
    label: "Monday - Friday",
    value: "8:00 AM - 5:00 PM",
  },
  {
    icon: Clock,
    label: "Saturday",
    value: "8:00 AM - 12:00 PM",
  },
  {
    icon: Clock,
    label: "Sunday & Holidays",
    value: "Closed",
  },
];

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-secondary/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb 
            items={[
              { label: "Home", href: "/" },
              { label: "Contact Us" },
            ]}
          />
          
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Get in touch with Barangay Salud Mitra
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Office Location with Map */}
            <Card className="shadow-medium">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Office Location
                </h2>
                <div className="mb-4">
                  <div className="flex gap-3 items-start">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-foreground">Address</p>
                      <p className="text-muted-foreground">
                        Barangay Salud Mitra<br />
                        Baguio City, Benguet<br />
                        Philippines
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg overflow-hidden border border-border">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3827.1234567890!2d120.6010!3d16.4110!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTbCsDI0JzM5LjYiTiAxMjDCsDM2JzAzLjYiRQ!5e0!3m2!1sen!2sph!4v1234567890"
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </CardContent>
            </Card>

            {/* Right: Contact Information */}
            <Card className="shadow-medium">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Contact Information
                </h2>
                <div className="space-y-4">
                  {contactInfo.map((info, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <info.icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
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

          {/* Barangay Officials Section */}
          <Officials />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

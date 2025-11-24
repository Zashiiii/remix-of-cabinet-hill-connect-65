import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

const officials = [
  {
    name: "Hon. Maria Santos",
    position: "Barangay Captain",
    positionTl: "Kapitan ng Barangay",
  },
  {
    name: "Hon. Juan Dela Cruz",
    position: "Barangay Kagawad",
    positionTl: "Kagawad ng Barangay",
  },
  {
    name: "Hon. Rosa Martinez",
    position: "Barangay Kagawad",
    positionTl: "Kagawad ng Barangay",
  },
  {
    name: "Hon. Pedro Reyes",
    position: "Barangay Kagawad",
    positionTl: "Kagawad ng Barangay",
  },
  {
    name: "Hon. Carmen Garcia",
    position: "Barangay Kagawad",
    positionTl: "Kagawad ng Barangay",
  },
  {
    name: "Hon. Jose Aquino",
    position: "Barangay Kagawad",
    positionTl: "Kagawad ng Barangay",
  },
  {
    name: "Hon. Teresa Lopez",
    position: "SK Chairperson",
    positionTl: "Pangulo ng SK",
  },
  {
    name: "Hon. Ricardo Santos",
    position: "Barangay Secretary",
    positionTl: "Kalihim ng Barangay",
  },
  {
    name: "Hon. Linda Cruz",
    position: "Barangay Treasurer",
    positionTl: "Ingat-yaman ng Barangay",
  },
];

const Officials = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Barangay Officials
          </h2>
          <p className="text-lg text-muted-foreground">
            Mga Opisyal ng Barangay
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {officials.map((official, index) => (
            <Card 
              key={index}
              className="hover:shadow-medium transition-shadow duration-300 border-border bg-card"
            >
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-1">
                  {official.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {official.position}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {official.positionTl}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Officials;

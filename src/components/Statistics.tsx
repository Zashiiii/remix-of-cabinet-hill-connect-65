import { Card, CardContent } from "@/components/ui/card";
import { Users, Home, TrendingUp } from "lucide-react";

const statistics = [
  {
    icon: Users,
    label: "Total Residents",
    value: "0",
    subtext: "Mga Residente",
  },
  {
    icon: Home,
    label: "Households",
    value: "0",
    subtext: "Mga Tahanan",
  },
  {
    icon: TrendingUp,
    label: "Senior Citizens",
    value: "0",
    subtext: "Mga Nakatatanda",
  },
];

const Statistics = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statistics.map((stat, index) => (
            <Card 
              key={index} 
              className="hover:shadow-medium transition-shadow duration-300 border-border bg-card"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <stat.icon className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Statistics;

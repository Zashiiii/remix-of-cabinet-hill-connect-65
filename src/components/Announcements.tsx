import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";

const announcements = [
  {
    type: "important",
    title: "New Online Certificate System",
    titleTl: "Bagong Sistema ng Online na Sertipiko",
    description: "Our new online certificate request system is now live! Request your barangay certificates from home.",
    descriptionTl: "Ang aming bagong sistema ng online na kahilingan ng sertipiko ay live na! Humiling ng inyong barangay certificates mula sa bahay.",
    date: "January 15, 2024",
  },
  {
    type: "general",
    title: "Office Hours Update",
    titleTl: "Pagbabago sa Oras ng Opisina",
    description: "Barangay Hall will be open Monday to Friday, 8:00 AM - 5:00 PM. Closed on weekends and holidays.",
    descriptionTl: "Ang Barangay Hall ay bukas Lunes hanggang Biyernes, 8:00 AM - 5:00 PM. Sarado sa weekend at holiday.",
    date: "January 10, 2024",
  },
  {
    type: "general",
    title: "Community Clean-up Drive",
    titleTl: "Kampanya sa Paglilinis ng Komunidad",
    description: "Join us for our monthly clean-up drive this Saturday at 7:00 AM. Meeting point at Barangay Hall.",
    descriptionTl: "Samahan kami sa aming buwanang kampanya sa paglilinis ngayong Sabado ng 7:00 AM. Tagpuan sa Barangay Hall.",
    date: "January 8, 2024",
  },
];

const Announcements = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="h-8 w-8 text-accent" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Announcements
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            Mga Paalala at Balita
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {announcements.map((announcement, index) => (
            <Card 
              key={index}
              className={`border-l-4 ${
                announcement.type === "important" 
                  ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20" 
                  : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      {announcement.titleTl}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {announcement.date}
                  </span>
                </div>
                <p className="text-foreground mb-1">
                  {announcement.description}
                </p>
                <p className="text-sm text-muted-foreground italic">
                  {announcement.descriptionTl}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Announcements;

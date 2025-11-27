import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Loader2 } from "lucide-react";
import { fetchActiveAnnouncements } from "@/utils/api";

interface Announcement {
  id: string;
  type: "important" | "general";
  title: string;
  titleTl: string;
  description: string;
  descriptionTl: string;
  date: string;
}

const defaultAnnouncements: Announcement[] = [
  {
    id: "1",
    type: "important",
    title: "New Online Certificate System",
    titleTl: "Bagong Sistema ng Online na Sertipiko",
    description: "Our new online certificate request system is now live! Request your barangay certificates from home.",
    descriptionTl: "Ang aming bagong sistema ng online na kahilingan ng sertipiko ay live na! Humiling ng inyong barangay certificates mula sa bahay.",
    date: "January 15, 2024",
  },
  {
    id: "2",
    type: "general",
    title: "Office Hours Update",
    titleTl: "Pagbabago sa Oras ng Opisina",
    description: "Barangay Hall will be open Monday to Friday, 8:00 AM - 5:00 PM. Closed on weekends and holidays.",
    descriptionTl: "Ang Barangay Hall ay bukas Lunes hanggang Biyernes, 8:00 AM - 5:00 PM. Sarado sa weekend at holiday.",
    date: "January 10, 2024",
  },
];

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        // Try to fetch from Supabase first
        const data = await fetchActiveAnnouncements();
        
        if (data && data.length > 0) {
          // Map Supabase data to our format
          const mapped: Announcement[] = data.map((item: any) => ({
            id: item.id,
            type: (item.announcement_type === 'important' ? 'important' : 'general') as "important" | "general",
            title: item.title,
            titleTl: item.title_tl || item.title,
            description: item.content,
            descriptionTl: item.content_tl || item.content,
            date: new Date(item.created_at).toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            }),
          }));
          setAnnouncements(mapped);
        } else {
          // Fall back to localStorage or defaults
          const stored = localStorage.getItem("barangay_announcements");
          if (stored) {
            const parsed = JSON.parse(stored);
            setAnnouncements(Array.isArray(parsed) ? parsed : defaultAnnouncements);
          } else {
            setAnnouncements(defaultAnnouncements);
          }
        }
      } catch (error) {
        console.error("Error loading announcements:", error);
        // Fall back to localStorage or defaults on error
        try {
          const stored = localStorage.getItem("barangay_announcements");
          if (stored) {
            const parsed = JSON.parse(stored);
            setAnnouncements(Array.isArray(parsed) ? parsed : defaultAnnouncements);
          } else {
            setAnnouncements(defaultAnnouncements);
          }
        } catch {
          setAnnouncements(defaultAnnouncements);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();

    // Listen for storage changes for live updates (backward compatibility)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "barangay_announcements" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setAnnouncements(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.error("Error parsing announcements:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (isLoading) {
    return (
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

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
          {announcements.length === 0 ? (
            <Card className="border-l-4 border-l-muted">
              <CardContent className="p-6 text-center text-muted-foreground">
                No announcements at this time.
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement, index) => (
              <Card 
                key={announcement.id || index}
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
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Announcements;

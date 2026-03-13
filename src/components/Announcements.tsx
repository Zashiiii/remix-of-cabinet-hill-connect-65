import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { fetchActiveAnnouncements } from "@/utils/api";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  type: "important" | "general";
  title: string;
  titleTl: string;
  description: string;
  descriptionTl: string;
  date: string;
  imageUrl?: string;
}

const TRUNCATE_LENGTH = 200;

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = announcement.description.length > TRUNCATE_LENGTH;
  const displayText = !expanded && needsTruncation
    ? announcement.description.slice(0, TRUNCATE_LENGTH) + "..."
    : announcement.description;
  const displayTextTl = !expanded && needsTruncation && announcement.descriptionTl.length > TRUNCATE_LENGTH
    ? announcement.descriptionTl.slice(0, TRUNCATE_LENGTH) + "..."
    : announcement.descriptionTl;

  return (
    <Card
      className={`border-l-4 overflow-hidden ${
        announcement.type === "important"
          ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"
          : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      }`}
    >
      <CardContent className="p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          {announcement.imageUrl && (
            <img
              src={announcement.imageUrl}
              alt=""
              className="w-full sm:w-32 sm:h-32 h-48 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="min-w-0 overflow-hidden">
                <h3 className="font-bold text-lg text-foreground break-words overflow-hidden text-ellipsis">
                  {announcement.title}
                </h3>
                <p className="text-sm text-muted-foreground italic break-words overflow-hidden text-ellipsis">
                  {announcement.titleTl}
                </p>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                {announcement.date}
              </span>
            </div>
            <p className="text-foreground break-words whitespace-pre-line overflow-hidden">{displayText}</p>
            <p className="text-sm text-muted-foreground italic mt-2 break-words whitespace-pre-line overflow-hidden">
              {displayTextTl}
            </p>
            {needsTruncation && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary mt-2"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>View Less <ChevronUp className="ml-1 h-3 w-3" /></>
                ) : (
                  <>View More <ChevronDown className="ml-1 h-3 w-3" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const data = await fetchActiveAnnouncements();

        if (data && data.length > 0) {
          const mapped: Announcement[] = data.map((item: any) => ({
            id: item.id,
            type: (item.type === "important" ? "important" : "general") as "important" | "general",
            title: item.title,
            titleTl: item.title_tl || item.title,
            description: item.content,
            descriptionTl: item.content_tl || item.content,
            date: new Date(item.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            imageUrl: item.image_url || undefined,
          }));
          // Sort: important first, then by date descending
          mapped.sort((a, b) => {
            if (a.type === "important" && b.type !== "important") return -1;
            if (a.type !== "important" && b.type === "important") return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
          setAnnouncements(mapped);
        } else {
          setAnnouncements([]);
        }
      } catch (error) {
        console.error("Error loading announcements:", error);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnnouncements();

    const channel = supabase
      .channel("public-announcements-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "announcements",
      }, () => {
        loadAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No announcements at this time.</p>
                <p className="text-sm mt-1">Check back later for updates.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(showAll ? announcements : announcements.slice(0, 3)).map((announcement, index) => (
                <AnnouncementCard key={announcement.id || index} announcement={announcement} />
              ))}
              {announcements.length > 3 && (
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "View Less" : `View More Announcements (${announcements.length - 3} more)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Announcements;

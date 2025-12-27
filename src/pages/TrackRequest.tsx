import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import RequestStatusCard, { RequestData } from "@/components/RequestStatusCard";
import { toast } from "sonner";
import { trackRequest } from "@/utils/api";
import { supabase } from "@/integrations/supabase/client";

// Client-side rate limiting for tracking requests
const TRACK_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_TRACK_REQUESTS = 5; // 5 requests per minute

const TrackRequest = () => {
  const [controlNumber, setControlNumber] = useState("");
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const trackAttemptsRef = useRef<number[]>([]);

  // Real-time subscription for status updates
  useEffect(() => {
    if (!requestData?.controlNumber) return;

    console.log('Setting up real-time subscription for:', requestData.controlNumber);

    const channel = supabase
      .channel(`track-request-${requestData.controlNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'certificate_requests',
          filter: `control_number=eq.${requestData.controlNumber}`,
        },
        async (payload) => {
          console.log('Real-time update received:', payload);
          // Refetch the updated data
          const updated = await trackRequest(requestData.controlNumber);
          if (updated) {
            setRequestData(updated);
            toast.info("Status updated!");
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [requestData?.controlNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!controlNumber.trim()) {
      toast.error("Please enter a control number");
      return;
    }

    // Client-side rate limiting
    const now = Date.now();
    trackAttemptsRef.current = trackAttemptsRef.current.filter(
      (timestamp) => now - timestamp < TRACK_LIMIT_WINDOW_MS
    );
    
    if (trackAttemptsRef.current.length >= MAX_TRACK_REQUESTS) {
      toast.error("Too many tracking requests. Please wait a moment before trying again.");
      return;
    }
    
    trackAttemptsRef.current.push(now);

    try {
      setIsSearching(true);
      const request = await trackRequest(controlNumber.trim());
      
      if (request) {
        setRequestData(request);
        toast.success("Request found!");
      } else {
        setRequestData(null);
        toast.error("No request found with this control number");
      }
      
      setSearched(true);
    } catch (error) {
      toast.error("Something went wrong. Please try again or visit the barangay hall.");
      setRequestData(null);
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-secondary/30 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb 
            items={[
              { label: "Home", href: "/" },
              { label: "Track Request" },
            ]}
          />
          
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Track Your Certificate Request
              </h1>
              <p className="text-lg text-muted-foreground">
                Enter your control number to check the status
              </p>
            </div>

            <Card className="shadow-medium mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="text"
                    placeholder="CERT-20251001-0001"
                    value={controlNumber}
                    onChange={(e) => setControlNumber(e.target.value)}
                    className="flex-1 text-lg h-12"
                  />
                  <Button 
                    type="submit"
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground sm:w-auto"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-5 w-5" />
                        Track Request
                      </>
                    )}
                  </Button>
                </form>
                
                {/* Helper text */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Enter the control number you received when submitting your certificate request. 
                    Status updates will appear in real-time without refreshing the page.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status Display */}
            {searched && !requestData && (
              <Card className="shadow-medium bg-muted/30 border-dashed">
                <CardContent className="p-8 text-center">
                  <p className="text-lg text-muted-foreground">
                    No request found with this control number.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please check your control number and try again.
                  </p>
                </CardContent>
              </Card>
            )}

            {requestData && <RequestStatusCard request={requestData} />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackRequest;
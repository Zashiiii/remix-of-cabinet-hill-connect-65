import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import RequestStatusCard, { RequestData } from "@/components/RequestStatusCard";
import { toast } from "sonner";

// Mock data for demonstration
const mockRequests: Record<string, RequestData> = {
  "CERT-20251001-0001": {
    controlNumber: "CERT-20251001-0001",
    certificateType: "Barangay Clearance",
    residentName: "Juan Dela Cruz",
    dateRequested: new Date("2025-10-01"),
    status: "ready_for_pickup",
    purpose: "Employment requirement for job application at ABC Company",
    remarks: "Certificate is ready for pickup at the barangay hall during office hours (8:00 AM - 5:00 PM, Monday-Friday). Please bring a valid ID.",
  },
  "CERT-20251002-0023": {
    controlNumber: "CERT-20251002-0023",
    certificateType: "Certificate of Indigency",
    residentName: "Maria Santos",
    dateRequested: new Date("2025-10-02"),
    status: "for_review",
    purpose: "Medical assistance for hospital bills",
  },
  "CERT-20251003-0045": {
    controlNumber: "CERT-20251003-0045",
    certificateType: "Certificate of Residency",
    residentName: "Pedro Reyes",
    dateRequested: new Date("2025-10-03"),
    status: "approved",
    purpose: "Proof of residency for school enrollment",
    remarks: "Document is being prepared and will be ready for pickup soon.",
  },
  "CERT-20251004-0067": {
    controlNumber: "CERT-20251004-0067",
    certificateType: "Business Permit Clearance",
    residentName: "Ana Garcia",
    dateRequested: new Date("2025-10-04"),
    status: "pending",
    purpose: "Starting a sari-sari store in the barangay",
  },
  "CERT-20251005-0089": {
    controlNumber: "CERT-20251005-0089",
    certificateType: "Certificate of Good Moral Character",
    residentName: "Jose Mendoza",
    dateRequested: new Date("2025-10-05"),
    status: "rejected",
    purpose: "Application for scholarship program",
    remarks: "Unable to verify residency. Please visit the barangay hall to update your records.",
  },
};

const TrackRequest = () => {
  const [controlNumber, setControlNumber] = useState("");
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!controlNumber.trim()) {
      toast.error("Please enter a control number");
      return;
    }

    const request = mockRequests[controlNumber.trim()];
    
    if (request) {
      setRequestData(request);
      toast.success("Request found!");
    } else {
      setRequestData(null);
      toast.error("No request found with this control number");
    }
    
    setSearched(true);
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
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Track Request
                  </Button>
                </form>
                
                {/* Helper text with example control numbers */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Demo control numbers you can try:</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• CERT-20251001-0001 (Ready for Pickup)</li>
                    <li>• CERT-20251002-0023 (For Review)</li>
                    <li>• CERT-20251003-0045 (Approved)</li>
                    <li>• CERT-20251004-0067 (Pending)</li>
                    <li>• CERT-20251005-0089 (Rejected)</li>
                  </ul>
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

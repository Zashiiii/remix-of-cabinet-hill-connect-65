import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import EcologicalProfileForm from "@/components/resident/EcologicalProfileForm";

const EcologicalProfile = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/resident/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Ecological Profile Census</h1>
                <p className="text-muted-foreground">Submit your household's ecological profile data</p>
            </div>

            <Alert className="mb-6 border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-muted-foreground">
                This feature helps reduce manual house-to-house data collection and improves barangay reporting efficiency. Your submission will be reviewed and approved by staff before being included in analytics.
              </AlertDescription>
            </Alert>
            </div>

            <EcologicalProfileForm 
              onSuccess={() => navigate("/resident/dashboard")}
              onCancel={() => navigate("/resident/dashboard")}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default EcologicalProfile;

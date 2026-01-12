import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import EcologicalProfileForm from "@/components/resident/EcologicalProfileForm";

const EcologicalProfile = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/resident/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Ecological Profile Census</h1>
                <p className="text-muted-foreground">Submit your household's ecological profile data</p>
              </div>
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

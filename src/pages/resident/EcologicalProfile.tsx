import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import EcologicalProfileContent from "@/components/resident/EcologicalProfileContent";

const EcologicalProfile = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useResidentAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/resident/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>

        <EcologicalProfileContent onSuccess={() => navigate("/resident/dashboard")} />
      </div>
    </div>
  );
};

export default EcologicalProfile;

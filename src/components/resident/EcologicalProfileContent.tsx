import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EcologicalProfileForm from "@/components/resident/EcologicalProfileForm";

interface EcologicalProfileContentProps {
  onSuccess?: () => void;
}

const EcologicalProfileContent = ({ onSuccess }: EcologicalProfileContentProps) => {
  return (
    <div className="w-full mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Ecological Profile Census</h2>
        <p className="text-muted-foreground">Submit your household's ecological profile data</p>
      </div>

      <Alert className="mb-6 border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-muted-foreground">
          This feature helps reduce manual house-to-house data collection and improves barangay reporting efficiency. Your submission will be reviewed and approved by staff before being included in analytics.
        </AlertDescription>
      </Alert>

      <EcologicalProfileForm
        onSuccess={onSuccess}
        onCancel={onSuccess}
      />
    </div>
  );
};

export default EcologicalProfileContent;

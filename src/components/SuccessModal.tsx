import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlNumber: string;
}

const SuccessModal = ({ open, onOpenChange, controlNumber }: SuccessModalProps) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCopy = () => {
    navigator.clipboard.writeText(controlNumber);
    setCopied(true);
    toast.success("Control number copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackRequest = () => {
    onOpenChange(false);
    navigate(`/track-request`);
  };

  const handleNewRequest = () => {
    onOpenChange(false);
    // Reset form by reloading the page
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Certificate Request Submitted!
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Your control number:</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-bold text-foreground">{controlNumber}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                >
                  <Copy className={`h-4 w-4 ${copied ? 'text-accent' : ''}`} />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                Save this number to track your request
              </p>
              <p className="text-muted-foreground">
                You will receive an email notification once your certificate is processed
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleTrackRequest}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Track This Request
          </Button>
          <Button
            onClick={handleNewRequest}
            variant="outline"
            className="w-full"
          >
            Submit Another Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessModal;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NameChangeRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentId: string;
  currentName: {
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
  };
  onSuccess?: () => void;
}

const NameChangeRequestForm = ({
  open,
  onOpenChange,
  residentId,
  currentName,
  onSuccess,
}: NameChangeRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedFirstName: currentName.firstName,
    requestedMiddleName: currentName.middleName,
    requestedLastName: currentName.lastName,
    requestedSuffix: currentName.suffix,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requestedFirstName.trim() || !formData.requestedLastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for the name change");
      return;
    }

    if (formData.reason.trim().length < 10) {
      toast.error("Please provide a more detailed reason (at least 10 characters)");
      return;
    }

    // Check if there's actually a change
    const hasChange =
      formData.requestedFirstName.trim() !== currentName.firstName ||
      formData.requestedMiddleName.trim() !== currentName.middleName ||
      formData.requestedLastName.trim() !== currentName.lastName ||
      formData.requestedSuffix.trim() !== currentName.suffix;

    if (!hasChange) {
      toast.error("No changes detected. Please modify at least one name field.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("name_change_requests").insert({
        resident_id: residentId,
        current_first_name: currentName.firstName,
        current_middle_name: currentName.middleName || null,
        current_last_name: currentName.lastName,
        current_suffix: currentName.suffix || null,
        requested_first_name: formData.requestedFirstName.trim(),
        requested_middle_name: formData.requestedMiddleName.trim() || null,
        requested_last_name: formData.requestedLastName.trim(),
        requested_suffix: formData.requestedSuffix.trim() || null,
        reason: formData.reason.trim(),
      });

      if (error) throw error;

      toast.success("Name change request submitted successfully!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        requestedFirstName: currentName.firstName,
        requestedMiddleName: currentName.middleName,
        requestedLastName: currentName.lastName,
        requestedSuffix: currentName.suffix,
        reason: "",
      });
    } catch (error: any) {
      console.error("Error submitting name change request:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Name Change</DialogTitle>
          <DialogDescription>
            Submit a request to correct your name. Staff will review and approve or reject your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Current Name:</p>
              <p className="text-sm text-muted-foreground">
                {[currentName.firstName, currentName.middleName, currentName.lastName, currentName.suffix]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="requestedFirstName">First Name *</Label>
                <Input
                  id="requestedFirstName"
                  value={formData.requestedFirstName}
                  onChange={(e) =>
                    setFormData({ ...formData, requestedFirstName: e.target.value })
                  }
                  placeholder="Juan"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedMiddleName">Middle Name</Label>
                <Input
                  id="requestedMiddleName"
                  value={formData.requestedMiddleName}
                  onChange={(e) =>
                    setFormData({ ...formData, requestedMiddleName: e.target.value })
                  }
                  placeholder="Santos"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedLastName">Last Name *</Label>
                <Input
                  id="requestedLastName"
                  value={formData.requestedLastName}
                  onChange={(e) =>
                    setFormData({ ...formData, requestedLastName: e.target.value })
                  }
                  placeholder="Dela Cruz"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedSuffix">Suffix</Label>
                <Input
                  id="requestedSuffix"
                  value={formData.requestedSuffix}
                  onChange={(e) =>
                    setFormData({ ...formData, requestedSuffix: e.target.value })
                  }
                  placeholder="Jr., Sr."
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Name Change *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please explain why you need to change your name (e.g., typo in registration, incorrect spelling)"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.reason.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NameChangeRequestForm;

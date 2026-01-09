import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const INCIDENT_TYPES = [
  "Noise Complaint",
  "Property Dispute",
  "Domestic Violence",
  "Theft/Robbery",
  "Vandalism",
  "Assault",
  "Public Disturbance",
  "Neighbor Dispute",
  "Traffic Incident",
  "Other"
];

interface IncidentRequestFormProps {
  residentId: string;
  residentName: string;
  onSuccess: (incidentNumber: string) => void;
}

const IncidentRequestForm = ({ residentId, residentName, onSuccess }: IncidentRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    incidentType: "",
    incidentDate: new Date().toISOString().split("T")[0],
    complainantAddress: "",
    complainantContact: "",
    respondentName: "",
    respondentAddress: "",
    incidentLocation: "",
    incidentDescription: "",
  });

  const generateIncidentNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `INC-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.incidentType || !formData.incidentDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const incidentNumber = generateIncidentNumber();
      
      const { error } = await supabase.from("incidents").insert({
        incident_number: incidentNumber,
        incident_date: formData.incidentDate,
        incident_type: formData.incidentType,
        complainant_name: residentName,
        complainant_address: formData.complainantAddress || null,
        complainant_contact: formData.complainantContact || null,
        respondent_name: formData.respondentName || null,
        respondent_address: formData.respondentAddress || null,
        incident_location: formData.incidentLocation || null,
        incident_description: formData.incidentDescription,
        status: "open",
        submitted_by_resident_id: residentId,
        approval_status: "pending",
      });

      if (error) throw error;

      toast.success("Incident report submitted successfully");
      onSuccess(incidentNumber);
      
      // Reset form
      setFormData({
        incidentType: "",
        incidentDate: new Date().toISOString().split("T")[0],
        complainantAddress: "",
        complainantContact: "",
        respondentName: "",
        respondentAddress: "",
        incidentLocation: "",
        incidentDescription: "",
      });
    } catch (error: any) {
      console.error("Error submitting incident:", error);
      toast.error(error.message || "Failed to submit incident report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Incident Type *</Label>
          <Select 
            value={formData.incidentType} 
            onValueChange={(v) => setFormData({ ...formData, incidentType: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select incident type" />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Incident Date *</Label>
          <Input
            type="date"
            value={formData.incidentDate}
            onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      <Separator />
      <h4 className="font-medium">Your Information (Complainant)</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Your Name</Label>
          <Input value={residentName} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label>Contact Number</Label>
          <Input
            value={formData.complainantContact}
            onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Your Address</Label>
          <Input
            value={formData.complainantAddress}
            onChange={(e) => setFormData({ ...formData, complainantAddress: e.target.value })}
            placeholder="Complete address"
          />
        </div>
      </div>

      <Separator />
      <h4 className="font-medium">Respondent Information (if applicable)</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Respondent Name</Label>
          <Input
            value={formData.respondentName}
            onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
            placeholder="Full name (if known)"
          />
        </div>
        <div className="space-y-2">
          <Label>Respondent Address</Label>
          <Input
            value={formData.respondentAddress}
            onChange={(e) => setFormData({ ...formData, respondentAddress: e.target.value })}
            placeholder="Address (if known)"
          />
        </div>
      </div>

      <Separator />
      <h4 className="font-medium">Incident Details</h4>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Incident Location</Label>
          <Input
            value={formData.incidentLocation}
            onChange={(e) => setFormData({ ...formData, incidentLocation: e.target.value })}
            placeholder="Where did the incident occur?"
          />
        </div>
        <div className="space-y-2">
          <Label>Incident Description *</Label>
          <Textarea
            value={formData.incidentDescription}
            onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
            placeholder="Describe the incident in detail..."
            rows={5}
          />
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
        <p>⚠️ Your incident report will be reviewed by barangay staff before being processed. You will be notified once it has been approved or if additional information is needed.</p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit Incident Report
      </Button>
    </form>
  );
};

export default IncidentRequestForm;

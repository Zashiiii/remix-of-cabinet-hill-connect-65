import { useState, useRef } from "react";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
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
  userId: string;
  onSuccess: (incidentNumber: string) => void;
}

const IncidentRequestForm = ({ residentId, residentName, userId, onSuccess }: IncidentRequestFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setPhotoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    setIsUploading(true);
    try {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("incident-photos")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("incident-photos")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.incidentType || !formData.incidentDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photo if selected
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

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
        photo_evidence_url: photoUrl,
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
      removePhoto();
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

        {/* Photo Upload Section */}
        <div className="space-y-2">
          <Label>Photo Evidence (Optional)</Label>
          <div className="border-2 border-dashed rounded-lg p-4">
            {photoPreview ? (
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Evidence preview" 
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center justify-center py-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Click to upload photo evidence</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
        <p>⚠️ Your incident report will be reviewed by barangay staff before being processed. You will be notified once it has been approved or if additional information is needed.</p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || isUploading}>
        {(isSubmitting || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isUploading ? "Uploading photo..." : "Submit Incident Report"}
      </Button>
    </form>
  );
};

export default IncidentRequestForm;

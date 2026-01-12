import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  Home, 
  Users, 
  Droplets, 
  Zap, 
  FileText,
  Send,
  Save,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useResidentAuth } from "@/hooks/useResidentAuth";

// Form field options
const HOUSE_OWNERSHIP = ["Owned", "Rented", "Caretaker", "Others"];
const LOT_OWNERSHIP = ["Owned", "Rented", "Caretaker", "Others"];
const DWELLING_TYPES = ["Permanent concrete", "Semi Permanent", "Temporary", "Others"];
const LIGHTING_SOURCES = ["Electricity", "Kerosene", "Solar", "Others"];
const WATER_SOURCES = ["Spring", "Deepwell (private)", "Deepwell (public)", "Piped water", "Others"];
const WATER_STORAGE = ["Tank", "Elevated Tank", "Jars", "Drums/Cans", "Plastic Containers", "Others"];
const FOOD_STORAGE = ["Refrigerator", "Cabinet/Shelves", "Others"];
const TOILET_FACILITIES = ["Flush with septic tank", "Flush with sewer system", "Water sealed (pit)", "Pit privy", "Others"];
const GARBAGE_DISPOSAL = ["City collection system", "Communal pit", "Backyard pit", "Open dump", "Composting", "Burning", "Others"];
const DRAINAGE_FACILITIES = ["Open drainage", "Closed drainage", "None", "Others"];
const COMMUNICATION_SERVICES = ["Telephone", "Cellular networks", "Internet", "Postal Services", "Others"];
const MEANS_OF_TRANSPORT = ["PUB", "PUJ", "Taxi", "Private car", "Motorcycle", "Bicycle", "Others"];
const INFO_SOURCES = ["TV", "Radio", "Newspaper", "Internet", "Others"];

interface EcologicalProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface SubmissionData {
  id?: string;
  submission_number?: string;
  status?: string;
  household_number: string;
  address: string;
  house_number: string;
  street_purok: string;
  district: string;
  years_staying: number | null;
  place_of_origin: string;
  ethnic_group: string;
  house_ownership: string;
  lot_ownership: string;
  dwelling_type: string;
  lighting_source: string;
  water_supply_level: string;
  water_storage: string[];
  food_storage_type: string[];
  toilet_facilities: string[];
  drainage_facilities: string[];
  garbage_disposal: string[];
  communication_services: string[];
  means_of_transport: string[];
  info_sources: string[];
  household_members: any[];
  health_data: any;
  is_4ps_beneficiary: boolean;
  solo_parent_count: number;
  pwd_count: number;
  additional_notes: string;
  respondent_name: string;
  respondent_relation: string;
}

const defaultFormData: SubmissionData = {
  household_number: "",
  address: "",
  house_number: "",
  street_purok: "",
  district: "",
  years_staying: null,
  place_of_origin: "",
  ethnic_group: "",
  house_ownership: "",
  lot_ownership: "",
  dwelling_type: "",
  lighting_source: "",
  water_supply_level: "",
  water_storage: [],
  food_storage_type: [],
  toilet_facilities: [],
  drainage_facilities: [],
  garbage_disposal: [],
  communication_services: [],
  means_of_transport: [],
  info_sources: [],
  household_members: [],
  health_data: {},
  is_4ps_beneficiary: false,
  solo_parent_count: 0,
  pwd_count: 0,
  additional_notes: "",
  respondent_name: "",
  respondent_relation: "",
};

const EcologicalProfileForm = ({ onSuccess, onCancel }: EcologicalProfileFormProps) => {
  const { user, profile } = useResidentAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic-info");
  const [formData, setFormData] = useState<SubmissionData>(defaultFormData);
  const [existingSubmissions, setExistingSubmissions] = useState<any[]>([]);
  const [residentId, setResidentId] = useState<string | null>(null);

  // Load existing submissions and resident profile
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setIsLoading(true);
      
      try {
        // Get resident ID
        const { data: residentData } = await supabase
          .from("residents")
          .select("id, first_name, middle_name, last_name, household_id")
          .eq("user_id", user.id)
          .single();

        if (residentData) {
          setResidentId(residentData.id);
          
          // Pre-fill respondent name
          const fullName = [residentData.first_name, residentData.middle_name, residentData.last_name]
            .filter(Boolean)
            .join(" ");
          setFormData(prev => ({
            ...prev,
            respondent_name: fullName,
            respondent_relation: "Self"
          }));

          // If resident has household, pre-fill household data
          if (residentData.household_id) {
            const { data: householdData } = await supabase
              .from("households")
              .select("*")
              .eq("id", residentData.household_id)
              .single();

            if (householdData) {
              setFormData(prev => ({
                ...prev,
                household_number: householdData.household_number || "",
                address: householdData.address || "",
                house_number: householdData.house_number || "",
                street_purok: householdData.street_purok || "",
                district: householdData.district || "",
                years_staying: householdData.years_staying,
                place_of_origin: householdData.place_of_origin || "",
                ethnic_group: householdData.ethnic_group || "",
                house_ownership: householdData.house_ownership || "",
                lot_ownership: householdData.lot_ownership || "",
                dwelling_type: householdData.dwelling_type || "",
                lighting_source: householdData.lighting_source || "",
                water_supply_level: householdData.water_supply_level || "",
                water_storage: Array.isArray(householdData.water_storage) ? householdData.water_storage : [],
                food_storage_type: Array.isArray(householdData.food_storage_type) ? householdData.food_storage_type : [],
                toilet_facilities: Array.isArray(householdData.toilet_facilities) ? householdData.toilet_facilities : [],
                drainage_facilities: Array.isArray(householdData.drainage_facilities) ? householdData.drainage_facilities : [],
                garbage_disposal: Array.isArray(householdData.garbage_disposal) ? householdData.garbage_disposal : [],
                communication_services: Array.isArray(householdData.communication_services) ? householdData.communication_services : [],
                means_of_transport: Array.isArray(householdData.means_of_transport) ? householdData.means_of_transport : [],
                info_sources: Array.isArray(householdData.info_sources) ? householdData.info_sources : [],
              }));
            }
          }
        }

        // Load existing submissions
        const { data: submissions } = await supabase
          .from("ecological_profile_submissions")
          .select("*")
          .order("created_at", { ascending: false });

        if (submissions) {
          setExistingSubmissions(submissions);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleCheckboxArray = (field: keyof SubmissionData, value: string, checked: boolean) => {
    const currentArray = formData[field] as string[];
    if (checked) {
      setFormData(prev => ({ ...prev, [field]: [...currentArray, value] }));
    } else {
      setFormData(prev => ({ ...prev, [field]: currentArray.filter(v => v !== value) }));
    }
  };

  const handleSubmit = async () => {
    if (!residentId) {
      toast.error("You must be a registered resident to submit");
      return;
    }

    if (!formData.household_number) {
      toast.error("Please enter a household number");
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate submission number
      const { data: submissionNumber, error: numError } = await supabase
        .rpc("generate_ecological_submission_number");

      if (numError) throw numError;

      // Insert submission
      const { error } = await supabase
        .from("ecological_profile_submissions")
        .insert({
          submission_number: submissionNumber,
          submitted_by_resident_id: residentId,
          household_number: formData.household_number,
          address: formData.address,
          house_number: formData.house_number,
          street_purok: formData.street_purok,
          district: formData.district,
          years_staying: formData.years_staying,
          place_of_origin: formData.place_of_origin,
          ethnic_group: formData.ethnic_group,
          house_ownership: formData.house_ownership,
          lot_ownership: formData.lot_ownership,
          dwelling_type: formData.dwelling_type,
          lighting_source: formData.lighting_source,
          water_supply_level: formData.water_supply_level,
          water_storage: formData.water_storage,
          food_storage_type: formData.food_storage_type,
          toilet_facilities: formData.toilet_facilities,
          drainage_facilities: formData.drainage_facilities,
          garbage_disposal: formData.garbage_disposal,
          communication_services: formData.communication_services,
          means_of_transport: formData.means_of_transport,
          info_sources: formData.info_sources,
          household_members: formData.household_members,
          health_data: formData.health_data,
          is_4ps_beneficiary: formData.is_4ps_beneficiary,
          solo_parent_count: formData.solo_parent_count,
          pwd_count: formData.pwd_count,
          additional_notes: formData.additional_notes,
          respondent_name: formData.respondent_name,
          respondent_relation: formData.respondent_relation,
          interview_date: format(new Date(), "yyyy-MM-dd"),
        });

      if (error) throw error;

      toast.success("Ecological profile submitted successfully!", {
        description: `Submission number: ${submissionNumber}. Staff will review your submission.`
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      under_review: "default",
      approved: "outline",
      rejected: "destructive",
    };
    
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      under_review: <AlertCircle className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      rejected: <AlertCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {icons[status]}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const tabs = [
    { id: "basic-info", label: "Basic Info", icon: FileText },
    { id: "housing", label: "Housing", icon: Home },
    { id: "services", label: "Services", icon: Zap },
    { id: "utilities", label: "Utilities", icon: Droplets },
    { id: "additional", label: "Additional", icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Submissions */}
      {existingSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Submissions
            </CardTitle>
            <CardDescription>Your ecological profile census submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingSubmissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{sub.submission_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Household: {sub.household_number || "N/A"} • 
                      Submitted: {format(new Date(sub.created_at), "MMM dd, yyyy")}
                    </p>
                    {sub.status === "rejected" && sub.rejection_reason && (
                      <p className="text-sm text-destructive mt-1">
                        Reason: {sub.rejection_reason}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(sub.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Submit Ecological Profile Census
          </CardTitle>
          <CardDescription>
            Fill out your household's ecological profile. This will be reviewed by staff before being included in official records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1 text-xs md:text-sm">
                  <tab.icon className="h-4 w-4 hidden md:block" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[400px] pr-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic-info" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="household_number">Household Number *</Label>
                    <Input
                      id="household_number"
                      value={formData.household_number}
                      onChange={(e) => setFormData({ ...formData, household_number: e.target.value })}
                      placeholder="e.g., HH-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house_number">House Number</Label>
                    <Input
                      id="house_number"
                      value={formData.house_number}
                      onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                      placeholder="e.g., 123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street_purok">Street/Purok</Label>
                    <Input
                      id="street_purok"
                      value={formData.street_purok}
                      onChange={(e) => setFormData({ ...formData, street_purok: e.target.value })}
                      placeholder="e.g., Purok 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Complete Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_staying">Years Staying</Label>
                    <Input
                      id="years_staying"
                      type="number"
                      min="0"
                      value={formData.years_staying || ""}
                      onChange={(e) => setFormData({ ...formData, years_staying: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="place_of_origin">Place of Origin</Label>
                    <Input
                      id="place_of_origin"
                      value={formData.place_of_origin}
                      onChange={(e) => setFormData({ ...formData, place_of_origin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ethnic_group">Ethnic Group</Label>
                    <Input
                      id="ethnic_group"
                      value={formData.ethnic_group}
                      onChange={(e) => setFormData({ ...formData, ethnic_group: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="respondent_name">Respondent Name</Label>
                    <Input
                      id="respondent_name"
                      value={formData.respondent_name}
                      onChange={(e) => setFormData({ ...formData, respondent_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="respondent_relation">Relation to Household</Label>
                    <Input
                      id="respondent_relation"
                      value={formData.respondent_relation}
                      onChange={(e) => setFormData({ ...formData, respondent_relation: e.target.value })}
                      placeholder="e.g., Head, Spouse, Son"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Housing Tab */}
              <TabsContent value="housing" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>House Ownership</Label>
                    <Select
                      value={formData.house_ownership}
                      onValueChange={(v) => setFormData({ ...formData, house_ownership: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUSE_OWNERSHIP.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lot Ownership</Label>
                    <Select
                      value={formData.lot_ownership}
                      onValueChange={(v) => setFormData({ ...formData, lot_ownership: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LOT_OWNERSHIP.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dwelling Type</Label>
                    <Select
                      value={formData.dwelling_type}
                      onValueChange={(v) => setFormData({ ...formData, dwelling_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DWELLING_TYPES.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lighting Source</Label>
                    <Select
                      value={formData.lighting_source}
                      onValueChange={(v) => setFormData({ ...formData, lighting_source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_SOURCES.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Communication Services</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {COMMUNICATION_SERVICES.map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={`comm-${service}`}
                            checked={formData.communication_services.includes(service)}
                            onCheckedChange={(checked) => handleCheckboxArray("communication_services", service, !!checked)}
                          />
                          <label htmlFor={`comm-${service}`} className="text-sm">{service}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Means of Transport</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {MEANS_OF_TRANSPORT.map((transport) => (
                        <div key={transport} className="flex items-center space-x-2">
                          <Checkbox
                            id={`trans-${transport}`}
                            checked={formData.means_of_transport.includes(transport)}
                            onCheckedChange={(checked) => handleCheckboxArray("means_of_transport", transport, !!checked)}
                          />
                          <label htmlFor={`trans-${transport}`} className="text-sm">{transport}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Information Sources</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {INFO_SOURCES.map((source) => (
                        <div key={source} className="flex items-center space-x-2">
                          <Checkbox
                            id={`info-${source}`}
                            checked={formData.info_sources.includes(source)}
                            onCheckedChange={(checked) => handleCheckboxArray("info_sources", source, !!checked)}
                          />
                          <label htmlFor={`info-${source}`} className="text-sm">{source}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Utilities Tab */}
              <TabsContent value="utilities" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Water Supply Level</Label>
                    <Select
                      value={formData.water_supply_level}
                      onValueChange={(v) => setFormData({ ...formData, water_supply_level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {WATER_SOURCES.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Water Storage</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {WATER_STORAGE.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`water-${item}`}
                            checked={formData.water_storage.includes(item)}
                            onCheckedChange={(checked) => handleCheckboxArray("water_storage", item, !!checked)}
                          />
                          <label htmlFor={`water-${item}`} className="text-sm">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Toilet Facilities</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {TOILET_FACILITIES.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`toilet-${item}`}
                            checked={formData.toilet_facilities.includes(item)}
                            onCheckedChange={(checked) => handleCheckboxArray("toilet_facilities", item, !!checked)}
                          />
                          <label htmlFor={`toilet-${item}`} className="text-sm">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Garbage Disposal</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {GARBAGE_DISPOSAL.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`garbage-${item}`}
                            checked={formData.garbage_disposal.includes(item)}
                            onCheckedChange={(checked) => handleCheckboxArray("garbage_disposal", item, !!checked)}
                          />
                          <label htmlFor={`garbage-${item}`} className="text-sm">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Drainage Facilities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {DRAINAGE_FACILITIES.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox
                            id={`drain-${item}`}
                            checked={formData.drainage_facilities.includes(item)}
                            onCheckedChange={(checked) => handleCheckboxArray("drainage_facilities", item, !!checked)}
                          />
                          <label htmlFor={`drain-${item}`} className="text-sm">{item}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Additional Tab */}
              <TabsContent value="additional" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_4ps"
                      checked={formData.is_4ps_beneficiary}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_4ps_beneficiary: !!checked })}
                    />
                    <label htmlFor="is_4ps" className="text-sm font-medium">4Ps Beneficiary</label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="solo_parent">Solo Parent Count</Label>
                    <Input
                      id="solo_parent"
                      type="number"
                      min="0"
                      value={formData.solo_parent_count}
                      onChange={(e) => setFormData({ ...formData, solo_parent_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd">PWD Count</Label>
                    <Input
                      id="pwd"
                      type="number"
                      min="0"
                      value={formData.pwd_count}
                      onChange={(e) => setFormData({ ...formData, pwd_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.additional_notes}
                    onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                    placeholder="Any additional information about your household..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EcologicalProfileForm;


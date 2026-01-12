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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, 
  Home, 
  Users, 
  Droplets, 
  Zap, 
  FileText,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  UserPlus,
  GraduationCap,
  Leaf,
  Stethoscope
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
const GENDERS = ["Male", "Female"];
const RELATIONSHIPS = ["Head", "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandfather", "Grandmother", "Grandson", "Granddaughter", "Son-in-law", "Daughter-in-law", "Other Relative", "Non-relative"];
const EDUCATION_LEVELS = ["No formal education", "Elementary level", "Elementary graduate", "High school level", "High school graduate", "Vocational", "College level", "College graduate", "Post-graduate"];
const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Divorced", "Live-in"];
const RELIGIONS = ["Roman Catholic", "Protestant", "Iglesia ni Cristo", "Islam", "Buddhist", "Others"];
const SCHOOLING_STATUSES = ["In School", "Out of School", "Not Yet in School", "Graduate"];
const EMPLOYMENT_STATUSES = ["Employed", "Unemployed", "Self-employed", "Student", "Retired", "Housewife/Househusband"];
const INCOME_RANGES = ["3,000 & below", "3,001-4,999", "5,000-6,999", "7,000-8,999", "9,000-10,999", "11,000-14,999", "15,000-19,999", "20,000 & above", "None"];

interface HouseholdMember {
  id: string;
  full_name: string;
  birth_date: string;
  age: number | null;
  gender: string;
  relationship_to_head: string;
  civil_status: string;
  religion: string;
  schooling_status: string;
  education_level: string;
  employment_status: string;
  occupation: string;
  monthly_income: string;
  is_pwd: boolean;
  is_solo_parent: boolean;
}

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
                water_storage: Array.isArray(householdData.water_storage) ? (householdData.water_storage as string[]) : [],
                food_storage_type: Array.isArray(householdData.food_storage_type) ? (householdData.food_storage_type as string[]) : [],
                toilet_facilities: Array.isArray(householdData.toilet_facilities) ? (householdData.toilet_facilities as string[]) : [],
                drainage_facilities: Array.isArray(householdData.drainage_facilities) ? (householdData.drainage_facilities as string[]) : [],
                garbage_disposal: Array.isArray(householdData.garbage_disposal) ? (householdData.garbage_disposal as string[]) : [],
                communication_services: Array.isArray(householdData.communication_services) ? (householdData.communication_services as string[]) : [],
                means_of_transport: Array.isArray(householdData.means_of_transport) ? (householdData.means_of_transport as string[]) : [],
                info_sources: Array.isArray(householdData.info_sources) ? (householdData.info_sources as string[]) : [],
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

    // Validate at least one household member marked as 'Head'
    const hasHeadOfHousehold = formData.household_members.some(
      (member: HouseholdMember) => member.relationship_to_head === "Head"
    );
    
    if (!hasHeadOfHousehold) {
      toast.error("Please add at least one household member marked as 'Head'", {
        description: "Every household must have a head of household designated."
      });
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

  const createEmptyMember = (): HouseholdMember => ({
    id: crypto.randomUUID(),
    full_name: "",
    birth_date: "",
    age: null,
    gender: "",
    relationship_to_head: "",
    civil_status: "",
    religion: "",
    schooling_status: "",
    education_level: "",
    employment_status: "",
    occupation: "",
    monthly_income: "",
    is_pwd: false,
    is_solo_parent: false,
  });

  const calculateAgeFromBirthDate = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthDateChange = (memberId: string, birthDate: string) => {
    const age = calculateAgeFromBirthDate(birthDate);
    setFormData(prev => ({
      ...prev,
      household_members: prev.household_members.map((m: HouseholdMember) => 
        m.id === memberId ? { ...m, birth_date: birthDate, age } : m
      )
    }));
  };

  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState<HouseholdMember>(createEmptyMember());

  const handleSaveNewMember = () => {
    if (!newMember.full_name) {
      toast.error("Please enter the member's full name");
      return;
    }
    setFormData(prev => ({
      ...prev,
      household_members: [...prev.household_members, newMember]
    }));
    setNewMember(createEmptyMember());
    setIsAddMemberOpen(false);
    toast.success("Household member added");
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;
    setFormData(prev => ({
      ...prev,
      household_members: prev.household_members.map((m: HouseholdMember) => 
        m.id === editingMember.id ? editingMember : m
      )
    }));
    setEditingMember(null);
    toast.success("Member updated");
  };

  const addHouseholdMember = () => {
    setFormData(prev => ({
      ...prev,
      household_members: [...prev.household_members, createEmptyMember()]
    }));
  };

  const removeHouseholdMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      household_members: prev.household_members.filter((m: HouseholdMember) => m.id !== id)
    }));
  };

  const updateHouseholdMember = (id: string, field: keyof HouseholdMember, value: any) => {
    setFormData(prev => ({
      ...prev,
      household_members: prev.household_members.map((m: HouseholdMember) => 
        m.id === id ? { ...m, [field]: value } : m
      )
    }));
  };

  const tabs = [
    { id: "basic-info", label: "Basic Info", icon: FileText },
    { id: "housing", label: "Housing", icon: Home },
    { id: "services", label: "Services", icon: Zap },
    { id: "education-health", label: "Education & Health", icon: GraduationCap },
    { id: "members", label: "Household Members", icon: Users },
    { id: "environmental", label: "Environmental", icon: Leaf },
    { id: "health-info", label: "Health Info", icon: Stethoscope },
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
            <TabsList className="grid w-full grid-cols-7 mb-6">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1 text-xs px-1">
                  <tab.icon className="h-4 w-4 hidden lg:block" />
                  <span className="hidden md:inline truncate">{tab.label}</span>
                  <span className="md:hidden text-[10px]">{tab.label.split(' ')[0].substring(0, 4)}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[500px] pr-4">
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

              {/* Household Members Tab */}
              <TabsContent value="members" className="space-y-4 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Household Members ({formData.household_members.length})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Complete list of all members in household {formData.household_number || "N/A"}
                    </p>
                  </div>
                  <Button type="button" onClick={() => { setNewMember(createEmptyMember()); setIsAddMemberOpen(true); }} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </div>

                {formData.household_members.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-3">No household members added yet</p>
                    <Button type="button" onClick={() => { setNewMember(createEmptyMember()); setIsAddMemberOpen(true); }} variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Member
                    </Button>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[350px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Relation</TableHead>
                              <TableHead>Birth Date</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead>Sex</TableHead>
                              <TableHead>Civil Status</TableHead>
                              <TableHead>Religion</TableHead>
                              <TableHead>Schooling</TableHead>
                              <TableHead>Education</TableHead>
                              <TableHead>Employment</TableHead>
                              <TableHead>Income</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(formData.household_members as HouseholdMember[]).map((member, index) => (
                              <TableRow key={member.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  {member.full_name || "-"}
                                  {member.relationship_to_head === "Head" && (
                                    <Badge variant="outline" className="ml-2 text-xs">Head</Badge>
                                  )}
                                  {member.is_pwd && (
                                    <Badge variant="secondary" className="ml-1 text-xs">PWD</Badge>
                                  )}
                                  {member.is_solo_parent && (
                                    <Badge variant="secondary" className="ml-1 text-xs">Solo Parent</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{member.relationship_to_head || "-"}</TableCell>
                                <TableCell>{member.birth_date ? format(new Date(member.birth_date), "MM/dd/yyyy") : "-"}</TableCell>
                                <TableCell>{member.age ?? "-"}</TableCell>
                                <TableCell>{member.gender?.charAt(0).toUpperCase() || "-"}</TableCell>
                                <TableCell>{member.civil_status || "-"}</TableCell>
                                <TableCell>{member.religion || "-"}</TableCell>
                                <TableCell>{member.schooling_status || "-"}</TableCell>
                                <TableCell>{member.education_level || "-"}</TableCell>
                                <TableCell>{member.employment_status || "-"}</TableCell>
                                <TableCell>{member.monthly_income || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingMember(member)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => removeHouseholdMember(member.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Legend */}
                {formData.household_members.length > 0 && (
                  <Card className="mt-4">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Equivalents Legend</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p><strong>Sex:</strong> M - Male, F - Female</p>
                          <p><strong>Civil Status:</strong> S - Single, M - Married, W - Widowed, Sep - Separated</p>
                        </div>
                        <div>
                          <p><strong>Schooling:</strong> IS - In school, OS - Out of school, NYS - Not yet in school, G - Graduate</p>
                          <p><strong>Income Ranges:</strong> 3k & below, 3001-4999, 5000-6999, etc.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add Member Dialog */}
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Household Member</DialogTitle>
                      <DialogDescription>Enter the details of the household member</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={newMember.full_name}
                          onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                          placeholder="Last Name, First Name Middle Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Birth Date</Label>
                        <Input
                          type="date"
                          value={newMember.birth_date}
                          onChange={(e) => {
                            const age = calculateAgeFromBirthDate(e.target.value);
                            setNewMember({ ...newMember, birth_date: e.target.value, age });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input
                          type="number"
                          min="0"
                          max="150"
                          value={newMember.age ?? ""}
                          onChange={(e) => setNewMember({ ...newMember, age: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="Auto-calculated from birth date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={newMember.gender} onValueChange={(v) => setNewMember({ ...newMember, gender: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship to Head</Label>
                        <Select value={newMember.relationship_to_head} onValueChange={(v) => setNewMember({ ...newMember, relationship_to_head: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Civil Status</Label>
                        <Select value={newMember.civil_status} onValueChange={(v) => setNewMember({ ...newMember, civil_status: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {CIVIL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Religion</Label>
                        <Select value={newMember.religion} onValueChange={(v) => setNewMember({ ...newMember, religion: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Schooling Status</Label>
                        <Select value={newMember.schooling_status} onValueChange={(v) => setNewMember({ ...newMember, schooling_status: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {SCHOOLING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Education Level</Label>
                        <Select value={newMember.education_level} onValueChange={(v) => setNewMember({ ...newMember, education_level: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {EDUCATION_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employment Status</Label>
                        <Select value={newMember.employment_status} onValueChange={(v) => setNewMember({ ...newMember, employment_status: v })}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input
                          value={newMember.occupation}
                          onChange={(e) => setNewMember({ ...newMember, occupation: e.target.value })}
                          placeholder="e.g., Farmer, Teacher"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Income (Cash)</Label>
                        <Select value={newMember.monthly_income} onValueChange={(v) => setNewMember({ ...newMember, monthly_income: v })}>
                          <SelectTrigger><SelectValue placeholder="Select range..." /></SelectTrigger>
                          <SelectContent>
                            {INCOME_RANGES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-6 md:col-span-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="new-pwd"
                            checked={newMember.is_pwd}
                            onCheckedChange={(checked) => setNewMember({ ...newMember, is_pwd: !!checked })}
                          />
                          <label htmlFor="new-pwd" className="text-sm">Person with Disability (PWD)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="new-solo"
                            checked={newMember.is_solo_parent}
                            onCheckedChange={(checked) => setNewMember({ ...newMember, is_solo_parent: !!checked })}
                          />
                          <label htmlFor="new-solo" className="text-sm">Solo Parent</label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveNewMember}>Add Member</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Member Dialog */}
                <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Household Member</DialogTitle>
                      <DialogDescription>Update the details of the household member</DialogDescription>
                    </DialogHeader>
                    {editingMember && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Full Name *</Label>
                          <Input
                            value={editingMember.full_name}
                            onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                            placeholder="Last Name, First Name Middle Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Birth Date</Label>
                          <Input
                            type="date"
                            value={editingMember.birth_date}
                            onChange={(e) => {
                              const age = calculateAgeFromBirthDate(e.target.value);
                              setEditingMember({ ...editingMember, birth_date: e.target.value, age });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Age</Label>
                          <Input
                            type="number"
                            min="0"
                            max="150"
                            value={editingMember.age ?? ""}
                            onChange={(e) => setEditingMember({ ...editingMember, age: e.target.value ? parseInt(e.target.value) : null })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gender</Label>
                          <Select value={editingMember.gender} onValueChange={(v) => setEditingMember({ ...editingMember, gender: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Relationship to Head</Label>
                          <Select value={editingMember.relationship_to_head} onValueChange={(v) => setEditingMember({ ...editingMember, relationship_to_head: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Civil Status</Label>
                          <Select value={editingMember.civil_status} onValueChange={(v) => setEditingMember({ ...editingMember, civil_status: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {CIVIL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Religion</Label>
                          <Select value={editingMember.religion} onValueChange={(v) => setEditingMember({ ...editingMember, religion: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Schooling Status</Label>
                          <Select value={editingMember.schooling_status} onValueChange={(v) => setEditingMember({ ...editingMember, schooling_status: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {SCHOOLING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Education Level</Label>
                          <Select value={editingMember.education_level} onValueChange={(v) => setEditingMember({ ...editingMember, education_level: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {EDUCATION_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Employment Status</Label>
                          <Select value={editingMember.employment_status} onValueChange={(v) => setEditingMember({ ...editingMember, employment_status: v })}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Occupation</Label>
                          <Input
                            value={editingMember.occupation}
                            onChange={(e) => setEditingMember({ ...editingMember, occupation: e.target.value })}
                            placeholder="e.g., Farmer, Teacher"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monthly Income (Cash)</Label>
                          <Select value={editingMember.monthly_income} onValueChange={(v) => setEditingMember({ ...editingMember, monthly_income: v })}>
                            <SelectTrigger><SelectValue placeholder="Select range..." /></SelectTrigger>
                            <SelectContent>
                              {INCOME_RANGES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-6 md:col-span-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="edit-pwd"
                              checked={editingMember.is_pwd}
                              onCheckedChange={(checked) => setEditingMember({ ...editingMember, is_pwd: !!checked })}
                            />
                            <label htmlFor="edit-pwd" className="text-sm">Person with Disability (PWD)</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="edit-solo"
                              checked={editingMember.is_solo_parent}
                              onCheckedChange={(checked) => setEditingMember({ ...editingMember, is_solo_parent: !!checked })}
                            />
                            <label htmlFor="edit-solo" className="text-sm">Solo Parent</label>
                          </div>
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
                      <Button onClick={handleUpdateMember}>Update Member</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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

              {/* Education & Health Tab */}
              <TabsContent value="education-health" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Education & Family Planning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="font-medium">Educational Background (Number in Household)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: "preschool", label: "Pre-school/Day care" },
                          { key: "primary", label: "Primary/Elementary" },
                          { key: "secondary", label: "Secondary/High School" },
                          { key: "vocational", label: "Vocational/Technical" },
                          { key: "college", label: "College/University" },
                          { key: "postgraduate", label: "Post Graduate" },
                        ].map((edu) => (
                          <div key={edu.key} className="flex items-center gap-2">
                            <span className="text-sm flex-1">{edu.label}</span>
                            <Input
                              type="number"
                              min="0"
                              className="w-16"
                              placeholder="0"
                              value={(formData.health_data as any)?.education?.[edu.key] || ""}
                              onChange={(e) => setFormData({
                                ...formData,
                                health_data: {
                                  ...(formData.health_data as any),
                                  education: {
                                    ...((formData.health_data as any)?.education || {}),
                                    [edu.key]: parseInt(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="family-planning"
                          checked={(formData.health_data as any)?.familyPlanningAcceptor || false}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            health_data: {
                              ...(formData.health_data as any),
                              familyPlanningAcceptor: !!checked
                            }
                          })}
                        />
                        <label htmlFor="family-planning" className="text-sm font-medium">Family Planning Acceptor</label>
                      </div>
                      {(formData.health_data as any)?.familyPlanningAcceptor && (
                        <div className="ml-6 space-y-2">
                          <Label>Type of Family Planning Method</Label>
                          <Select
                            value={(formData.health_data as any)?.familyPlanningType || ""}
                            onValueChange={(v) => setFormData({
                              ...formData,
                              health_data: {
                                ...(formData.health_data as any),
                                familyPlanningType: v
                              }
                            })}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Pills", "IUD", "Condom", "Injectable", "Implant", "BTL", "Vasectomy", "Natural", "Others"].map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="font-medium">Special Categories</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Senior Citizens (60+)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={(formData.health_data as any)?.seniorCount || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              health_data: {
                                ...(formData.health_data as any),
                                seniorCount: parseInt(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Solo Parents</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.solo_parent_count}
                            onChange={(e) => setFormData({ ...formData, solo_parent_count: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">PWD</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.pwd_count}
                            onChange={(e) => setFormData({ ...formData, pwd_count: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Pregnant Women</Label>
                          <Input
                            type="number"
                            min="0"
                            value={(formData.health_data as any)?.pregnantCount || ""}
                            onChange={(e) => setFormData({
                              ...formData,
                              health_data: {
                                ...(formData.health_data as any),
                                pregnantCount: parseInt(e.target.value) || 0
                              }
                            })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Checkbox
                          id="is_4ps"
                          checked={formData.is_4ps_beneficiary}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_4ps_beneficiary: !!checked })}
                        />
                        <label htmlFor="is_4ps" className="text-sm font-medium">4Ps Beneficiary</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Environmental Tab */}
              <TabsContent value="environmental" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Droplets className="h-4 w-4" />
                      Water & Sanitation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Water Supply Source</Label>
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

                    <div>
                      <Label className="text-sm font-medium">Food Storage</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {FOOD_STORAGE.map((item) => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={`food-${item}`}
                              checked={formData.food_storage_type.includes(item)}
                              onCheckedChange={(checked) => handleCheckboxArray("food_storage_type", item, !!checked)}
                            />
                            <label htmlFor={`food-${item}`} className="text-sm">{item}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Health Info Tab */}
              <TabsContent value="health-info" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Health & Nutrition Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="font-medium">Children with Malnutrition (by age group)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key: "0-11months", label: "0-11 months" },
                          { key: "1-4years", label: "1-4 years" },
                          { key: "5-7years", label: "5-7 years" },
                        ].map((age) => (
                          <div key={age.key} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">{age.label}</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={(formData.health_data as any)?.malnutrition?.[age.key] || ""}
                              onChange={(e) => setFormData({
                                ...formData,
                                health_data: {
                                  ...(formData.health_data as any),
                                  malnutrition: {
                                    ...((formData.health_data as any)?.malnutrition || {}),
                                    [age.key]: parseInt(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <Label className="font-medium">Disability Data (by type)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { key: "physical", label: "Physical" },
                          { key: "mental", label: "Mental" },
                          { key: "visual", label: "Visual" },
                          { key: "hearing", label: "Hearing" },
                          { key: "speech", label: "Speech" },
                        ].map((disability) => (
                          <div key={disability.key} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">{disability.label}</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={(formData.health_data as any)?.disability?.[disability.key] || ""}
                              onChange={(e) => setFormData({
                                ...formData,
                                health_data: {
                                  ...(formData.health_data as any),
                                  disability: {
                                    ...((formData.health_data as any)?.disability || {}),
                                    [disability.key]: parseInt(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <Label className="font-medium">Death Records (in past year)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key: "infant", label: "Infant Deaths" },
                          { key: "maternal", label: "Maternal Deaths" },
                          { key: "other", label: "Other Deaths" },
                        ].map((death) => (
                          <div key={death.key} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">{death.label}</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={(formData.health_data as any)?.deaths?.[death.key] || ""}
                              onChange={(e) => setFormData({
                                ...formData,
                                health_data: {
                                  ...(formData.health_data as any),
                                  deaths: {
                                    ...((formData.health_data as any)?.deaths || {}),
                                    [death.key]: parseInt(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                      placeholder="Any additional information about your household's health, environment, or other relevant details..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
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


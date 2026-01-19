import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, User, Home, Phone, Mail, Calendar, Briefcase, GraduationCap, Heart, Users, Pencil, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import NameChangeRequestForm from "@/components/resident/NameChangeRequestForm";

const RELATIONS = ["Head", "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandchild", "Other Relative", "Non-Relative"];
const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated", "Divorced", "Common Law"];
const RELIGIONS = ["Roman Catholic", "INC (Iglesia Ni Cristo)", "Islam", "Protestant", "Buddhist", "Others"];
const EDUCATION = ["No Formal Education", "Elementary", "High School", "Vocational", "College", "Post Graduate"];
const SCHOOLING_STATUS = ["In School", "Out of School", "Not Yet in School", "Graduate"];
const EMPLOYMENT_STATUS = ["Employed", "Self-Employed", "Unemployed", "Student", "Retired", "Homemaker"];
const EMPLOYMENT_CATEGORY = ["Private", "Government", "Self Employed", "OFW", "N/A"];
const GENDERS = ["Male", "Female"];

const ResidentProfile = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, isLoading: authLoading, refetchProfile } = useResidentAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [showNameChangeForm, setShowNameChangeForm] = useState(false);
  const [householdNumber, setHouseholdNumber] = useState("");
  const [isLinkingHousehold, setIsLinkingHousehold] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    gender: "",
    birthDate: "",
    civilStatus: "",
    contactNumber: "",
    email: "",
    occupation: "",
    relationToHead: "",
    religion: "",
    schoolingStatus: "",
    educationAttainment: "",
    employmentStatus: "",
    employmentCategory: "",
    monthlyIncomeCash: "",
    monthlyIncomeKind: "",
    livelihoodTraining: "",
    ethnicGroup: "",
    placeOfOrigin: "",
  });

  // Household data (read-only from census)
  const [householdData, setHouseholdData] = useState<any>(null);

  // Auth is now handled by ResidentProtectedRoute wrapper

  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`
          *,
          households (*)
        `)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data) {
        setResidentId(data.id);
        setFormData({
          firstName: data.first_name || "",
          middleName: data.middle_name || "",
          lastName: data.last_name || "",
          suffix: data.suffix || "",
          gender: data.gender || "",
          birthDate: data.birth_date || "",
          civilStatus: data.civil_status || "",
          contactNumber: data.contact_number || "",
          email: data.email || user?.email || "",
          occupation: data.occupation || "",
          relationToHead: data.relation_to_head || "",
          religion: data.religion || "",
          schoolingStatus: data.schooling_status || "",
          educationAttainment: data.education_attainment || "",
          employmentStatus: data.employment_status || "",
          employmentCategory: data.employment_category || "",
          monthlyIncomeCash: data.monthly_income_cash || "",
          monthlyIncomeKind: data.monthly_income_kind || "",
          livelihoodTraining: data.livelihood_training || "",
          ethnicGroup: data.ethnic_group || "",
          placeOfOrigin: data.place_of_origin || "",
        });

        if (data.households) {
          setHouseholdData(data.households);
        }
      } else {
        // Pre-fill email if no profile exists
        setFormData(prev => ({ ...prev, email: user?.email || "" }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Note: Name fields (first_name, middle_name, last_name, suffix) are NOT included
      // Only staff can update name fields
      const profileData = {
        gender: formData.gender || null,
        birth_date: formData.birthDate || null,
        civil_status: formData.civilStatus || null,
        contact_number: formData.contactNumber || null,
        email: formData.email || null,
        occupation: formData.occupation || null,
        relation_to_head: formData.relationToHead || null,
        religion: formData.religion || null,
        schooling_status: formData.schoolingStatus || null,
        education_attainment: formData.educationAttainment || null,
        employment_status: formData.employmentStatus || null,
        employment_category: formData.employmentCategory || null,
        monthly_income_cash: formData.monthlyIncomeCash || null,
        monthly_income_kind: formData.monthlyIncomeKind || null,
        livelihood_training: formData.livelihoodTraining || null,
        ethnic_group: formData.ethnicGroup || null,
        place_of_origin: formData.placeOfOrigin || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("residents")
          .update(profileData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Residents must have a profile created by staff/registration
        // They can only update existing profiles, not create new ones
        toast.error("Profile not found. Please contact barangay staff.");
        setIsSaving(false);
        return;
      }

      toast.success("Profile saved successfully");
      refetchProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLinkHousehold = async () => {
    if (!householdNumber.trim()) {
      toast.error("Please enter a household number");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    setIsLinkingHousehold(true);
    try {
      const { data, error } = await supabase.rpc("resident_link_to_household", {
        p_user_id: user.id,
        p_household_number: householdNumber.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; household_number?: string; household_address?: string };
      
      if (result.success) {
        toast.success(`Successfully linked to household ${result.household_number}`);
        setHouseholdNumber("");
        loadProfile(); // Reload to show household data
        refetchProfile();
      } else {
        toast.error(result.error || "Failed to link household");
      }
    } catch (error: any) {
      console.error("Error linking household:", error);
      toast.error(error.message || "Failed to link to household");
    } finally {
      setIsLinkingHousehold(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/resident/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <User className="h-6 w-6" />
                  My Profile
                </CardTitle>
                <CardDescription>
                  Update your personal information (Census Form Data)
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="household">Household</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suffix">Suffix</Label>
                    <Input
                      id="suffix"
                      value={formData.suffix}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                {residentId && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Found a typo in your name? You can request a correction.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNameChangeForm(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Request Name Change
                    </Button>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Date of Birth</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="civilStatus">Civil Status</Label>
                    <Select value={formData.civilStatus} onValueChange={(v) => setFormData({ ...formData, civilStatus: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select civil status" />
                      </SelectTrigger>
                      <SelectContent>
                        {CIVIL_STATUS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <Select value={formData.religion} onValueChange={(v) => setFormData({ ...formData, religion: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input
                      id="contactNumber"
                      value={formData.contactNumber}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      placeholder="09XXXXXXXXX"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationToHead">Relation to Household Head</Label>
                    <Select value={formData.relationToHead} onValueChange={(v) => setFormData({ ...formData, relationToHead: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ethnicGroup">Ethnic Group</Label>
                    <Input
                      id="ethnicGroup"
                      value={formData.ethnicGroup}
                      onChange={(e) => setFormData({ ...formData, ethnicGroup: e.target.value })}
                      placeholder="e.g., Ibaloi, Kankanaey"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="placeOfOrigin">Place of Origin</Label>
                    <Input
                      id="placeOfOrigin"
                      value={formData.placeOfOrigin}
                      onChange={(e) => setFormData({ ...formData, placeOfOrigin: e.target.value })}
                      placeholder="City/Municipality, Province"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="education" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolingStatus">Schooling Status</Label>
                    <Select value={formData.schoolingStatus} onValueChange={(v) => setFormData({ ...formData, schoolingStatus: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHOOLING_STATUS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="educationAttainment">Highest Education Attainment</Label>
                    <Select value={formData.educationAttainment} onValueChange={(v) => setFormData({ ...formData, educationAttainment: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="livelihoodTraining">Livelihood Training Received</Label>
                    <Input
                      id="livelihoodTraining"
                      value={formData.livelihoodTraining}
                      onChange={(e) => setFormData({ ...formData, livelihoodTraining: e.target.value })}
                      placeholder="e.g., TESDA NC II, Dressmaking, Welding"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employmentStatus">Employment Status</Label>
                    <Select value={formData.employmentStatus} onValueChange={(v) => setFormData({ ...formData, employmentStatus: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentCategory">Employment Category</Label>
                    <Select value={formData.employmentCategory} onValueChange={(v) => setFormData({ ...formData, employmentCategory: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_CATEGORY.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      placeholder="e.g., Teacher, Engineer, Vendor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncomeCash">Monthly Income (Cash)</Label>
                    <Input
                      id="monthlyIncomeCash"
                      value={formData.monthlyIncomeCash}
                      onChange={(e) => setFormData({ ...formData, monthlyIncomeCash: e.target.value })}
                      placeholder="e.g., 15,000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="monthlyIncomeKind">Monthly Income (In Kind)</Label>
                    <Input
                      id="monthlyIncomeKind"
                      value={formData.monthlyIncomeKind}
                      onChange={(e) => setFormData({ ...formData, monthlyIncomeKind: e.target.value })}
                      placeholder="e.g., Rice, Vegetables"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="household" className="space-y-6">
                {householdData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <Home className="h-4 w-4" />
                      <span className="text-sm">Household information from census records</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">Household Number</Label>
                        <p className="font-medium">{householdData.household_number || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">Address</Label>
                        <p className="font-medium">{householdData.address || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">Barangay</Label>
                        <p className="font-medium">{householdData.barangay || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">City</Label>
                        <p className="font-medium">{householdData.city || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">Province</Label>
                        <p className="font-medium">{householdData.province || "N/A"}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <Label className="text-muted-foreground text-xs">Dwelling Type</Label>
                        <p className="font-medium">{householdData.dwelling_type || "N/A"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      * Household information is managed by barangay staff. Contact the barangay office to update.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-medium text-lg mb-2">No Household Linked</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Your profile is not yet linked to a household record. Enter your household number below to link your account.
                      </p>
                    </div>
                    
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <Label htmlFor="householdNumber" className="text-sm font-medium">
                          Enter Your Household Number
                        </Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          You can find this number on your census form or ask your household head.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            id="householdNumber"
                            value={householdNumber}
                            onChange={(e) => setHouseholdNumber(e.target.value)}
                            placeholder="e.g., 12345678"
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleLinkHousehold}
                            disabled={isLinkingHousehold || !householdNumber.trim()}
                          >
                            {isLinkingHousehold ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Link className="h-4 w-4 mr-2" />
                                Link
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground text-center">
                        Don't know your household number? Contact the Barangay office for assistance.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Name Change Request Form */}
        {residentId && (
          <NameChangeRequestForm
            open={showNameChangeForm}
            onOpenChange={setShowNameChangeForm}
            residentId={residentId}
            currentName={{
              firstName: formData.firstName,
              middleName: formData.middleName,
              lastName: formData.lastName,
              suffix: formData.suffix,
            }}
            onSuccess={loadProfile}
          />
        )}
      </div>
    </div>
  );
};

export default ResidentProfile;

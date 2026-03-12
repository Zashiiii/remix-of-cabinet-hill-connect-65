import { useState, useEffect } from "react";
import { Save, Loader2, User, Phone, Mail, Calendar, Briefcase, GraduationCap, Heart, Users, Pencil, Link, Clock, CheckCircle, XCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useResidentAuth } from "@/hooks/useResidentAuth";
import { supabase } from "@/integrations/supabase/client";
import NameChangeRequestForm from "@/components/resident/NameChangeRequestForm";
import { format } from "date-fns";

const RELATIONS = ["Head", "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandchild", "Other Relative", "Non-Relative"];
const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated", "Divorced", "Common Law"];
const RELIGIONS = ["Roman Catholic", "INC (Iglesia Ni Cristo)", "Islam", "Protestant", "Buddhist", "Others"];
const EDUCATION = ["No Formal Education", "Elementary", "High School", "Vocational", "College", "Post Graduate"];
const SCHOOLING_STATUS = ["In School", "Out of School", "Not Yet in School", "Graduate"];
const EMPLOYMENT_STATUS = ["Employed", "Self-Employed", "Unemployed", "Student", "Retired", "Homemaker"];
const EMPLOYMENT_CATEGORY = ["Private", "Government", "Self Employed", "OFW", "N/A"];
const GENDERS = ["Male", "Female"];

const ProfileContent = () => {
  const { user, profile, refetchProfile } = useResidentAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [showNameChangeForm, setShowNameChangeForm] = useState(false);
  const [householdNumber, setHouseholdNumber] = useState("");
  const [householdReason, setHouseholdReason] = useState("");
  const [isLinkingHousehold, setIsLinkingHousehold] = useState(false);
  const [householdLinkRequests, setHouseholdLinkRequests] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    firstName: "", middleName: "", lastName: "", suffix: "",
    gender: "", birthDate: "", civilStatus: "", contactNumber: "",
    email: "", occupation: "", relationToHead: "", religion: "",
    schoolingStatus: "", educationAttainment: "", employmentStatus: "",
    employmentCategory: "", monthlyIncomeCash: "", monthlyIncomeKind: "",
    livelihoodTraining: "", ethnicGroup: "", placeOfOrigin: "",
  });

  const [householdData, setHouseholdData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadHouseholdLinkRequests();
    }
  }, [user]);

  const loadHouseholdLinkRequests = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.rpc("get_resident_household_link_requests", { p_user_id: user.id });
      if (!error && data) setHouseholdLinkRequests(data);
    } catch (err) {
      console.error("Error loading household link requests:", err);
    }
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("residents")
        .select(`*, households (*)`)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (data) {
        setResidentId(data.id);
        setFormData({
          firstName: data.first_name || "", middleName: data.middle_name || "",
          lastName: data.last_name || "", suffix: data.suffix || "",
          gender: data.gender || "", birthDate: data.birth_date || "",
          civilStatus: data.civil_status || "", contactNumber: data.contact_number || "",
          email: data.email || user?.email || "", occupation: data.occupation || "",
          relationToHead: data.relation_to_head || "", religion: data.religion || "",
          schoolingStatus: data.schooling_status || "", educationAttainment: data.education_attainment || "",
          employmentStatus: data.employment_status || "", employmentCategory: data.employment_category || "",
          monthlyIncomeCash: data.monthly_income_cash || "", monthlyIncomeKind: data.monthly_income_kind || "",
          livelihoodTraining: data.livelihood_training || "", ethnicGroup: data.ethnic_group || "",
          placeOfOrigin: data.place_of_origin || "",
        });
        if (data.households) setHouseholdData(data.households);
      } else {
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
      const { data: existing } = await supabase.from("residents").select("id").eq("user_id", user?.id).maybeSingle();
      const profileData = {
        gender: formData.gender || null, birth_date: formData.birthDate || null,
        civil_status: formData.civilStatus || null, contact_number: formData.contactNumber || null,
        email: formData.email || null, occupation: formData.occupation || null,
        relation_to_head: formData.relationToHead || null, religion: formData.religion || null,
        schooling_status: formData.schoolingStatus || null, education_attainment: formData.educationAttainment || null,
        employment_status: formData.employmentStatus || null, employment_category: formData.employmentCategory || null,
        monthly_income_cash: formData.monthlyIncomeCash || null, monthly_income_kind: formData.monthlyIncomeKind || null,
        livelihood_training: formData.livelihoodTraining || null, ethnic_group: formData.ethnicGroup || null,
        place_of_origin: formData.placeOfOrigin || null, updated_at: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabase.from("residents").update(profileData).eq("id", existing.id);
        if (error) throw error;
      } else {
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
    if (!householdNumber.trim()) { toast.error("Please enter a household number"); return; }
    if (!user?.id) { toast.error("You must be logged in"); return; }
    setIsLinkingHousehold(true);
    try {
      const { data, error } = await supabase.rpc("resident_request_household_link", {
        p_user_id: user.id, p_household_number: householdNumber.trim(), p_reason: householdReason.trim() || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; request_id?: string; message?: string };
      if (result.success) {
        toast.success(result.message || "Request submitted successfully");
        setHouseholdNumber(""); setHouseholdReason("");
        loadHouseholdLinkRequests();
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch (error: any) {
      console.error("Error requesting household link:", error);
      toast.error(error.message || "Failed to submit request");
    } finally {
      setIsLinkingHousehold(false);
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6" />
              My Profile
            </CardTitle>
            <CardDescription>Update your personal information (Census Form Data)</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                <Label>First Name</Label>
                <Input value={formData.firstName} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input value={formData.middleName} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Suffix</Label>
                <Input value={formData.suffix} disabled className="bg-muted cursor-not-allowed" />
              </div>
            </div>

            {residentId && (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">Found a typo in your name? You can request a correction.</p>
                <Button variant="outline" size="sm" onClick={() => setShowNameChangeForm(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Request Name Change
                </Button>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Civil Status</Label>
                <Select value={formData.civilStatus} onValueChange={(v) => setFormData({ ...formData, civilStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select civil status" /></SelectTrigger>
                  <SelectContent>{CIVIL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Religion</Label>
                <Select value={formData.religion} onValueChange={(v) => setFormData({ ...formData, religion: v })}>
                  <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                  <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} placeholder="09XXXXXXXXX" maxLength={11} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Relation to Household Head</Label>
                <Select value={formData.relationToHead} onValueChange={(v) => setFormData({ ...formData, relationToHead: v })}>
                  <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
                  <SelectContent>{RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ethnic Group</Label>
                <Input value={formData.ethnicGroup} onChange={(e) => setFormData({ ...formData, ethnicGroup: e.target.value })} placeholder="e.g., Ibaloi, Kankanaey" />
              </div>
              <div className="space-y-2">
                <Label>Place of Origin</Label>
                <Input value={formData.placeOfOrigin} onChange={(e) => setFormData({ ...formData, placeOfOrigin: e.target.value })} placeholder="City/Municipality" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schooling Status</Label>
                <Select value={formData.schoolingStatus} onValueChange={(v) => setFormData({ ...formData, schoolingStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{SCHOOLING_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Education Attainment</Label>
                <Select value={formData.educationAttainment} onValueChange={(v) => setFormData({ ...formData, educationAttainment: v })}>
                  <SelectTrigger><SelectValue placeholder="Select attainment" /></SelectTrigger>
                  <SelectContent>{EDUCATION.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select value={formData.employmentStatus} onValueChange={(v) => setFormData({ ...formData, employmentStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Category</Label>
                <Select value={formData.employmentCategory} onValueChange={(v) => setFormData({ ...formData, employmentCategory: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_CATEGORY.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} placeholder="e.g., Teacher, Farmer" />
              </div>
              <div className="space-y-2">
                <Label>Monthly Income (Cash)</Label>
                <Input value={formData.monthlyIncomeCash} onChange={(e) => setFormData({ ...formData, monthlyIncomeCash: e.target.value })} placeholder="e.g., 15000" />
              </div>
              <div className="space-y-2">
                <Label>Monthly Income (Kind)</Label>
                <Input value={formData.monthlyIncomeKind} onChange={(e) => setFormData({ ...formData, monthlyIncomeKind: e.target.value })} placeholder="e.g., Rice, Vegetables" />
              </div>
              <div className="space-y-2">
                <Label>Livelihood Training</Label>
                <Input value={formData.livelihoodTraining} onChange={(e) => setFormData({ ...formData, livelihoodTraining: e.target.value })} placeholder="e.g., TESDA, Farming" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="household" className="space-y-6">
            {householdData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Home className="h-4 w-4" /> Household Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Household No:</span> <span className="font-medium">{householdData.household_number}</span></div>
                    <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{householdData.address || "N/A"}</span></div>
                    <div><span className="text-muted-foreground">Purok/Street:</span> <span className="font-medium">{householdData.street_purok || "N/A"}</span></div>
                    <div><span className="text-muted-foreground">Dwelling Type:</span> <span className="font-medium">{householdData.dwelling_type || "N/A"}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No Household Linked</p>
                  <p className="text-sm">Request to link your account to a household below.</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Link className="h-4 w-4" /> Link to Household</h3>
                  <div className="space-y-2">
                    <Label>Household Number</Label>
                    <Input value={householdNumber} onChange={(e) => setHouseholdNumber(e.target.value)} placeholder="Enter household number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (optional)</Label>
                    <Textarea value={householdReason} onChange={(e) => setHouseholdReason(e.target.value)} placeholder="Why do you want to link to this household?" rows={2} />
                  </div>
                  <Button onClick={handleLinkHousehold} disabled={isLinkingHousehold}>
                    {isLinkingHousehold && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Link className="mr-2 h-4 w-4" />
                    Submit Request
                  </Button>
                </div>
              </div>
            )}

            {householdLinkRequests.length > 0 && (
              <div className="space-y-3 mt-4">
                <h3 className="font-semibold">Household Link Requests</h3>
                {householdLinkRequests.map((req: any) => (
                  <div key={req.id} className="p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="font-medium">Household #{req.household_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      {req.rejection_reason && (
                        <p className="text-sm text-destructive mt-1">Reason: {req.rejection_reason}</p>
                      )}
                    </div>
                    {getRequestStatusBadge(req.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {showNameChangeForm && residentId && (
        <NameChangeRequestForm
          residentId={residentId}
          currentName={{
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            suffix: formData.suffix,
          }}
          open={showNameChangeForm}
          onOpenChange={setShowNameChangeForm}
          onSuccess={() => { setShowNameChangeForm(false); loadProfile(); }}
        />
      )}
    </Card>
  );
};

export default ProfileContent;

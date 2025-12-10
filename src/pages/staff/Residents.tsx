import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  Mail,
  Home,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Loader2,
  Building,
  Droplets,
  Trash2,
  Wifi,
  Car,
  Save,
  X,
  RotateCcw,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuthContext } from "@/context/StaffAuthContext";

interface Household {
  id: string;
  household_number: string;
  address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  house_number: string | null;
  street_purok: string | null;
  district: string | null;
  place_of_origin: string | null;
  ethnic_group: string | null;
  house_ownership: string | null;
  lot_ownership: string | null;
  dwelling_type: string | null;
  lighting_source: string | null;
  water_supply_level: string | null;
  years_staying: number | null;
  toilet_facilities: unknown;
  drainage_facilities: unknown;
  garbage_disposal: unknown;
  water_storage: unknown;
  food_storage_type: unknown;
  communication_services: unknown;
  means_of_transport: unknown;
  info_sources: unknown;
}

interface Resident {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  birth_date: string | null;
  gender: string | null;
  civil_status: string | null;
  contact_number: string | null;
  email: string | null;
  religion: string | null;
  ethnic_group: string | null;
  place_of_origin: string | null;
  dialects_spoken: unknown;
  schooling_status: string | null;
  education_attainment: string | null;
  employment_status: string | null;
  employment_category: string | null;
  occupation: string | null;
  monthly_income_cash: string | null;
  monthly_income_kind: string | null;
  livelihood_training: string | null;
  relation_to_head: string | null;
  is_head_of_household: boolean | null;
  household_id: string | null;
  households: Household | null;
}

interface DeletedResident {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string | null;
  contact_number: string | null;
  deleted_at: string;
  deleted_by: string | null;
}

interface EditFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  birth_date: string;
  gender: string;
  civil_status: string;
  contact_number: string;
  email: string;
  religion: string;
  ethnic_group: string;
  place_of_origin: string;
  schooling_status: string;
  education_attainment: string;
  employment_status: string;
  employment_category: string;
  occupation: string;
  monthly_income_cash: string;
  monthly_income_kind: string;
  livelihood_training: string;
  relation_to_head: string;
  is_head_of_household: boolean;
}

const ITEMS_PER_PAGE = 10;

const StaffResidents = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    birth_date: "",
    gender: "",
    civil_status: "",
    contact_number: "",
    email: "",
    religion: "",
    ethnic_group: "",
    place_of_origin: "",
    schooling_status: "",
    education_attainment: "",
    employment_status: "",
    employment_category: "",
    occupation: "",
    monthly_income_cash: "",
    monthly_income_kind: "",
    livelihood_training: "",
    relation_to_head: "",
    is_head_of_household: false,
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingResident, setDeletingResident] = useState<Resident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "deleted">("active");
  const [deletedResidents, setDeletedResidents] = useState<DeletedResident[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Auth is now handled by ProtectedRoute wrapper

  const loadResidents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use RPC to get all residents (bypasses RLS for staff)
      const { data: allResidents, error: rpcError } = await supabase.rpc('get_all_residents_for_staff');
      
      if (rpcError) throw rpcError;

      let filteredResidents = allResidents || [];

      // Apply search filter client-side
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredResidents = filteredResidents.filter((r: any) => 
          r.first_name?.toLowerCase().includes(query) ||
          r.last_name?.toLowerCase().includes(query) ||
          r.contact_number?.includes(query)
        );
      }

      // Get total count before pagination
      const totalFiltered = filteredResidents.length;
      setTotalCount(totalFiltered);

      // Apply pagination client-side
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const paginatedResidents = filteredResidents.slice(from, to);

      // Fetch household data for these residents
      const householdIds = [...new Set(paginatedResidents.map((r: any) => r.household_id).filter(Boolean))];
      let householdMap: Record<string, Household> = {};
      
      if (householdIds.length > 0) {
        const { data: households } = await supabase
          .from('households')
          .select('*')
          .in('id', householdIds);
        
        if (households) {
          householdMap = Object.fromEntries(households.map(h => [h.id, h]));
        }
      }

      // Map residents with household data
      const residentsWithHouseholds = paginatedResidents.map((r: any) => ({
        ...r,
        households: r.household_id ? householdMap[r.household_id] || null : null
      }));

      setResidents(residentsWithHouseholds as Resident[]);
    } catch (error) {
      console.error("Error loading residents:", error);
      toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentPage]);

  const loadDeletedResidents = useCallback(async () => {
    setIsLoadingDeleted(true);
    try {
      const { data, error } = await supabase.rpc('get_deleted_residents_for_staff');
      if (error) throw error;
      setDeletedResidents(data || []);
    } catch (error) {
      console.error("Error loading deleted residents:", error);
      toast.error("Failed to load deleted residents");
    } finally {
      setIsLoadingDeleted(false);
    }
  }, []);

  const handleRestoreResident = async (residentId: string) => {
    setRestoringId(residentId);
    try {
      const { error } = await supabase.rpc('staff_restore_resident', {
        p_resident_id: residentId
      });
      if (error) throw error;
      toast.success("Resident restored successfully");
      loadDeletedResidents();
      loadResidents();
    } catch (error) {
      console.error("Error restoring resident:", error);
      toast.error("Failed to restore resident");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadResidents();
    }
  }, [isAuthenticated, loadResidents]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "deleted") {
      loadDeletedResidents();
    }
  }, [isAuthenticated, activeTab, loadDeletedResidents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadResidents();
  };

  const getFullName = (resident: Resident) => {
    const parts = [resident.first_name];
    if (resident.middle_name) parts.push(resident.middle_name);
    parts.push(resident.last_name);
    if (resident.suffix) parts.push(resident.suffix);
    return parts.join(" ");
  };

  const calculateAge = (birthDate: string | null) => {
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleViewProfile = (resident: Resident) => {
    setSelectedResident(resident);
    setShowProfileDialog(true);
  };

  const handleEditResident = (resident: Resident) => {
    setEditingResident(resident);
    setEditForm({
      first_name: resident.first_name || "",
      middle_name: resident.middle_name || "",
      last_name: resident.last_name || "",
      suffix: resident.suffix || "",
      birth_date: resident.birth_date || "",
      gender: resident.gender || "",
      civil_status: resident.civil_status || "",
      contact_number: resident.contact_number || "",
      email: resident.email || "",
      religion: resident.religion || "",
      ethnic_group: resident.ethnic_group || "",
      place_of_origin: resident.place_of_origin || "",
      schooling_status: resident.schooling_status || "",
      education_attainment: resident.education_attainment || "",
      employment_status: resident.employment_status || "",
      employment_category: resident.employment_category || "",
      occupation: resident.occupation || "",
      monthly_income_cash: resident.monthly_income_cash || "",
      monthly_income_kind: resident.monthly_income_kind || "",
      livelihood_training: resident.livelihood_training || "",
      relation_to_head: resident.relation_to_head || "",
      is_head_of_household: resident.is_head_of_household || false,
    });
    setShowEditDialog(true);
  };

  const handleUpdateResident = async () => {
    if (!editingResident) return;
    
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      toast.error("First name and last name are required");
      return;
    }

    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("residents")
        .update({
          first_name: editForm.first_name.trim(),
          middle_name: editForm.middle_name.trim() || null,
          last_name: editForm.last_name.trim(),
          suffix: editForm.suffix.trim() || null,
          birth_date: editForm.birth_date || null,
          gender: editForm.gender || null,
          civil_status: editForm.civil_status || null,
          contact_number: editForm.contact_number.trim() || null,
          email: editForm.email.trim() || null,
          religion: editForm.religion.trim() || null,
          ethnic_group: editForm.ethnic_group.trim() || null,
          place_of_origin: editForm.place_of_origin.trim() || null,
          schooling_status: editForm.schooling_status || null,
          education_attainment: editForm.education_attainment || null,
          employment_status: editForm.employment_status || null,
          employment_category: editForm.employment_category.trim() || null,
          occupation: editForm.occupation.trim() || null,
          monthly_income_cash: editForm.monthly_income_cash.trim() || null,
          monthly_income_kind: editForm.monthly_income_kind.trim() || null,
          livelihood_training: editForm.livelihood_training.trim() || null,
          relation_to_head: editForm.relation_to_head || null,
          is_head_of_household: editForm.is_head_of_household,
        })
        .eq("id", editingResident.id);

      if (error) throw error;

      toast.success("Resident updated successfully");
      setShowEditDialog(false);
      setEditingResident(null);
      loadResidents();
    } catch (error) {
      console.error("Error updating resident:", error);
      toast.error("Failed to update resident");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResident = async () => {
    if (!deletingResident) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('staff_delete_resident', {
        p_resident_id: deletingResident.id
      });

      if (error) throw error;

  toast.success("Resident moved to deleted list");
      setShowDeleteDialog(false);
      setDeletingResident(null);
      loadResidents();
      if (activeTab === "deleted") {
        loadDeletedResidents();
      }
    } catch (error) {
      console.error("Error deleting resident:", error);
      toast.error("Failed to delete resident");
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeletedFullName = (resident: DeletedResident) => {
    const parts = [resident.first_name];
    if (resident.middle_name) parts.push(resident.middle_name);
    parts.push(resident.last_name);
    if (resident.suffix) parts.push(resident.suffix);
    return parts.join(" ");
  };

  const formatArrayField = (arr: unknown) => {
    if (!arr) return "Not specified";
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.join(", ");
    }
    return "Not specified";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff-dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Resident Management</h1>
              <p className="text-sm text-muted-foreground">View and manage resident census data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Stats */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or contact number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{totalCount} total residents</span>
          </div>
        </div>

        {/* Tab Toggle */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "deleted")} className="mb-6">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Residents
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Deleted ({deletedResidents.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "active" ? (
          /* Residents Table */
          <Card>
            <CardHeader>
              <CardTitle>Residents List</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : residents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No residents found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Household</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residents.map((resident) => (
                        <TableRow key={resident.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{getFullName(resident)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {resident.gender || "N/A"} • {resident.birth_date ? `${calculateAge(resident.birth_date)} yrs` : "Age N/A"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {resident.contact_number && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {resident.contact_number}
                                </div>
                              )}
                              {resident.email && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {resident.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {resident.households ? (
                              <Badge variant="outline">{resident.households.household_number}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm max-w-[200px] truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {resident.households
                                ? `${resident.households.address || ""}, ${resident.households.barangay || ""}`
                                : "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewProfile(resident)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditResident(resident)}
                                title="Edit Resident"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingResident(resident);
                                  setShowDeleteDialog(true);
                                }}
                                title="Delete Resident"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Deleted Residents Table */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Deleted Residents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDeleted ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : deletedResidents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No deleted residents</p>
                  <p className="text-sm">Deleted residents will appear here for restoration</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedResidents.map((resident) => (
                      <TableRow key={resident.id} className="opacity-75">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{getDeletedFullName(resident)}</p>
                              <p className="text-xs text-muted-foreground">
                                {resident.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {resident.contact_number ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {resident.contact_number}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(resident.deleted_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(resident.deleted_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreResident(resident.id)}
                            disabled={restoringId === resident.id}
                            className="text-primary"
                          >
                            {restoringId === resident.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restore
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Full Census Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Resident Census Profile
              </DialogTitle>
              <DialogDescription>
                Complete census information for {selectedResident && getFullName(selectedResident)}
              </DialogDescription>
            </div>
            {selectedResident && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowProfileDialog(false);
                  handleEditResident(selectedResident);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </DialogHeader>

          {selectedResident && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="education">Education & Employment</TabsTrigger>
                  <TabsTrigger value="household">Household Info</TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-6 mt-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{getFullName(selectedResident)}</h3>
                      <p className="text-muted-foreground">
                        {selectedResident.is_head_of_household ? "Head of Household" : selectedResident.relation_to_head || "Member"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField icon={User} label="First Name" value={selectedResident.first_name} />
                    <InfoField icon={User} label="Middle Name" value={selectedResident.middle_name} />
                    <InfoField icon={User} label="Last Name" value={selectedResident.last_name} />
                    <InfoField icon={User} label="Suffix" value={selectedResident.suffix} />
                    <InfoField
                      icon={Calendar}
                      label="Birth Date"
                      value={selectedResident.birth_date ? new Date(selectedResident.birth_date).toLocaleDateString() : null}
                    />
                    <InfoField icon={Calendar} label="Age" value={calculateAge(selectedResident.birth_date)?.toString()} />
                    <InfoField icon={User} label="Gender" value={selectedResident.gender} />
                    <InfoField icon={User} label="Civil Status" value={selectedResident.civil_status} />
                    <InfoField icon={Phone} label="Contact Number" value={selectedResident.contact_number} />
                    <InfoField icon={Mail} label="Email" value={selectedResident.email} />
                    <InfoField icon={User} label="Religion" value={selectedResident.religion} />
                    <InfoField icon={Users} label="Ethnic Group" value={selectedResident.ethnic_group} />
                    <InfoField icon={MapPin} label="Place of Origin" value={selectedResident.place_of_origin} />
                    <InfoField
                      icon={User}
                      label="Dialects Spoken"
                      value={formatArrayField(selectedResident.dialects_spoken)}
                      className="col-span-2"
                    />
                  </div>
                </TabsContent>

                {/* Education & Employment Tab */}
                <TabsContent value="education" className="space-y-6 mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <InfoField icon={GraduationCap} label="Schooling Status" value={selectedResident.schooling_status} />
                      <InfoField icon={GraduationCap} label="Education Attainment" value={selectedResident.education_attainment} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Employment
                    </h4>
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <InfoField icon={Briefcase} label="Employment Status" value={selectedResident.employment_status} />
                      <InfoField icon={Briefcase} label="Employment Category" value={selectedResident.employment_category} />
                      <InfoField icon={Briefcase} label="Occupation" value={selectedResident.occupation} />
                      <InfoField icon={Briefcase} label="Monthly Income (Cash)" value={selectedResident.monthly_income_cash} />
                      <InfoField icon={Briefcase} label="Monthly Income (Kind)" value={selectedResident.monthly_income_kind} />
                      <InfoField icon={Briefcase} label="Livelihood Training" value={selectedResident.livelihood_training} />
                    </div>
                  </div>
                </TabsContent>

                {/* Household Information Tab */}
                <TabsContent value="household" className="space-y-6 mt-4">
                  {selectedResident.households ? (
                    <>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Household #{selectedResident.households.household_number}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedResident.households.address}, {selectedResident.households.barangay},{" "}
                          {selectedResident.households.city}, {selectedResident.households.province}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Housing Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pl-6">
                          <InfoField icon={Home} label="House Number" value={selectedResident.households.house_number} />
                          <InfoField icon={MapPin} label="Street/Purok" value={selectedResident.households.street_purok} />
                          <InfoField icon={MapPin} label="District" value={selectedResident.households.district} />
                          <InfoField icon={Home} label="House Ownership" value={selectedResident.households.house_ownership} />
                          <InfoField icon={Home} label="Lot Ownership" value={selectedResident.households.lot_ownership} />
                          <InfoField icon={Building} label="Dwelling Type" value={selectedResident.households.dwelling_type} />
                          <InfoField icon={Calendar} label="Years Staying" value={selectedResident.households.years_staying?.toString()} />
                          <InfoField icon={MapPin} label="Place of Origin" value={selectedResident.households.place_of_origin} />
                          <InfoField icon={Users} label="Ethnic Group" value={selectedResident.households.ethnic_group} />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Droplets className="h-4 w-4" />
                          Utilities & Facilities
                        </h4>
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <InfoField icon={Droplets} label="Water Supply Level" value={selectedResident.households.water_supply_level} />
                          <InfoField icon={Building} label="Lighting Source" value={selectedResident.households.lighting_source} />
                          <InfoField
                            icon={Droplets}
                            label="Water Storage"
                            value={formatArrayField(selectedResident.households.water_storage)}
                          />
                          <InfoField
                            icon={Trash2}
                            label="Garbage Disposal"
                            value={formatArrayField(selectedResident.households.garbage_disposal)}
                          />
                          <InfoField
                            icon={Building}
                            label="Toilet Facilities"
                            value={formatArrayField(selectedResident.households.toilet_facilities)}
                          />
                          <InfoField
                            icon={Droplets}
                            label="Drainage Facilities"
                            value={formatArrayField(selectedResident.households.drainage_facilities)}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          Services & Transportation
                        </h4>
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <InfoField
                            icon={Wifi}
                            label="Communication Services"
                            value={formatArrayField(selectedResident.households.communication_services)}
                          />
                          <InfoField
                            icon={Car}
                            label="Means of Transport"
                            value={formatArrayField(selectedResident.households.means_of_transport)}
                          />
                          <InfoField
                            icon={Building}
                            label="Food Storage"
                            value={formatArrayField(selectedResident.households.food_storage_type)}
                          />
                          <InfoField
                            icon={Wifi}
                            label="Information Sources"
                            value={formatArrayField(selectedResident.households.info_sources)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No household information available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Resident Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Resident Information
            </DialogTitle>
            <DialogDescription>
              Update the resident's personal, education, and employment information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="education">Education & Employment</TabsTrigger>
                <TabsTrigger value="household">Household Relation</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={editForm.middle_name}
                      onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                      placeholder="Enter middle name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suffix">Suffix</Label>
                    <Input
                      id="suffix"
                      value={editForm.suffix}
                      onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })}
                      placeholder="Jr., Sr., III"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Birth Date</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={editForm.birth_date}
                      onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={editForm.gender}
                      onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="civil_status">Civil Status</Label>
                    <Select
                      value={editForm.civil_status}
                      onValueChange={(value) => setEditForm({ ...editForm, civil_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_number">Contact Number</Label>
                    <Input
                      id="contact_number"
                      value={editForm.contact_number}
                      onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                      placeholder="09XX-XXX-XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <Input
                      id="religion"
                      value={editForm.religion}
                      onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })}
                      placeholder="Enter religion"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ethnic_group">Ethnic Group</Label>
                    <Input
                      id="ethnic_group"
                      value={editForm.ethnic_group}
                      onChange={(e) => setEditForm({ ...editForm, ethnic_group: e.target.value })}
                      placeholder="Enter ethnic group"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="place_of_origin">Place of Origin</Label>
                    <Input
                      id="place_of_origin"
                      value={editForm.place_of_origin}
                      onChange={(e) => setEditForm({ ...editForm, place_of_origin: e.target.value })}
                      placeholder="Enter place of origin"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Education & Employment Tab */}
              <TabsContent value="education" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schooling_status">Schooling Status</Label>
                      <Select
                        value={editForm.schooling_status}
                        onValueChange={(value) => setEditForm({ ...editForm, schooling_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In-school">In-school</SelectItem>
                          <SelectItem value="Out-of-school">Out-of-school</SelectItem>
                          <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="education_attainment">Education Attainment</Label>
                      <Select
                        value={editForm.education_attainment}
                        onValueChange={(value) => setEditForm({ ...editForm, education_attainment: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select attainment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No Formal Education">No Formal Education</SelectItem>
                          <SelectItem value="Elementary">Elementary</SelectItem>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Vocational">Vocational</SelectItem>
                          <SelectItem value="College">College</SelectItem>
                          <SelectItem value="Graduate">Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Employment
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employment_status">Employment Status</Label>
                      <Select
                        value={editForm.employment_status}
                        onValueChange={(value) => setEditForm({ ...editForm, employment_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employed">Employed</SelectItem>
                          <SelectItem value="Unemployed">Unemployed</SelectItem>
                          <SelectItem value="Self-employed">Self-employed</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                          <SelectItem value="Retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employment_category">Employment Category</Label>
                      <Input
                        id="employment_category"
                        value={editForm.employment_category}
                        onChange={(e) => setEditForm({ ...editForm, employment_category: e.target.value })}
                        placeholder="e.g., Private, Government"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="occupation">Occupation</Label>
                      <Input
                        id="occupation"
                        value={editForm.occupation}
                        onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                        placeholder="Enter occupation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="livelihood_training">Livelihood Training</Label>
                      <Input
                        id="livelihood_training"
                        value={editForm.livelihood_training}
                        onChange={(e) => setEditForm({ ...editForm, livelihood_training: e.target.value })}
                        placeholder="Training received"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_income_cash">Monthly Income (Cash)</Label>
                      <Input
                        id="monthly_income_cash"
                        value={editForm.monthly_income_cash}
                        onChange={(e) => setEditForm({ ...editForm, monthly_income_cash: e.target.value })}
                        placeholder="e.g., 15000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_income_kind">Monthly Income (Kind)</Label>
                      <Input
                        id="monthly_income_kind"
                        value={editForm.monthly_income_kind}
                        onChange={(e) => setEditForm({ ...editForm, monthly_income_kind: e.target.value })}
                        placeholder="e.g., Rice, Vegetables"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Household Relation Tab */}
              <TabsContent value="household" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="relation_to_head">Relation to Head</Label>
                    <Select
                      value={editForm.relation_to_head}
                      onValueChange={(value) => setEditForm({ ...editForm, relation_to_head: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Head">Head</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Grandparent">Grandparent</SelectItem>
                        <SelectItem value="Grandchild">Grandchild</SelectItem>
                        <SelectItem value="In-law">In-law</SelectItem>
                        <SelectItem value="Relative">Relative</SelectItem>
                        <SelectItem value="Boarder">Boarder</SelectItem>
                        <SelectItem value="Helper">Helper</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_head_of_household"
                        checked={editForm.is_head_of_household}
                        onCheckedChange={(checked) => 
                          setEditForm({ ...editForm, is_head_of_household: checked as boolean })
                        }
                      />
                      <Label htmlFor="is_head_of_household" className="cursor-pointer">
                        Is Head of Household
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingResident(null);
              }}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpdateResident} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Resident
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deletingResident && getFullName(deletingResident)}
              </span>
              ? You can restore this resident later from the "Deleted" tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingResident(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteResident}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Resident
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for displaying info fields
const InfoField = ({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  className?: string;
}) => (
  <div className={`space-y-1 ${className}`}>
    <Label className="text-xs text-muted-foreground flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Label>
    <p className="text-sm font-medium">{value || "Not specified"}</p>
  </div>
);

export default StaffResidents;

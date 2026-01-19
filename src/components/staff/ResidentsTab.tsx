import { useState, useEffect, useCallback } from "react";
import {
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TableSkeleton from "./TableSkeleton";

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

const ResidentsTab = () => {
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

  const loadResidents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: allResidents, error: rpcError } = await supabase.rpc('get_all_residents_for_staff');
      
      if (rpcError) throw rpcError;

      let filteredResidents = allResidents || [];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredResidents = filteredResidents.filter((r: any) => 
          r.first_name?.toLowerCase().includes(query) ||
          r.last_name?.toLowerCase().includes(query) ||
          r.contact_number?.includes(query)
        );
      }

      const totalFiltered = filteredResidents.length;
      setTotalCount(totalFiltered);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const paginatedResidents = filteredResidents.slice(from, to);

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
    loadResidents();
  }, [loadResidents]);

  useEffect(() => {
    if (activeTab === "deleted") {
      loadDeletedResidents();
    }
  }, [activeTab, loadDeletedResidents]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resident Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "deleted")}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Residents</TabsTrigger>
              <TabsTrigger value="deleted">
                <Archive className="h-4 w-4 mr-2" />
                Deleted
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or contact number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>

              {isLoading ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableSkeleton columns={5} rows={5} />
                  </Table>
                </div>
              ) : residents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">No Residents Found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "No residents match your search criteria." : "No approved residents in the system yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Household</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
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
                                  <p className="text-sm text-muted-foreground">{resident.gender || "N/A"}</p>
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
                                <Badge variant="outline">
                                  {resident.households.household_number}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {calculateAge(resident.birth_date) || "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewProfile(resident)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEditResident(resident)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setDeletingResident(resident);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="deleted">
              {isLoadingDeleted ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : deletedResidents.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">No Deleted Residents</h3>
                  <p className="text-muted-foreground">No residents have been deleted.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Deleted At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedResidents.map((resident) => (
                        <TableRow key={resident.id}>
                          <TableCell className="font-medium">{getDeletedFullName(resident)}</TableCell>
                          <TableCell>{resident.contact_number || resident.email || "N/A"}</TableCell>
                          <TableCell>{new Date(resident.deleted_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreResident(resident.id)}
                              disabled={restoringId === resident.id}
                            >
                              {restoringId === resident.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resident Profile</DialogTitle>
          </DialogHeader>
          {selectedResident && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{getFullName(selectedResident)}</h3>
                  <p className="text-muted-foreground">{selectedResident.gender} • {calculateAge(selectedResident.birth_date)} years old</p>
                </div>
              </div>
              
              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Contact Number</Label>
                  <p>{selectedResident.contact_number || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{selectedResident.email || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Civil Status</Label>
                  <p>{selectedResident.civil_status || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Religion</Label>
                  <p>{selectedResident.religion || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Occupation</Label>
                  <p>{selectedResident.occupation || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Education</Label>
                  <p>{selectedResident.education_attainment || "N/A"}</p>
                </div>
              </div>

              {selectedResident.households && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Household</Label>
                    <p>{selectedResident.households.household_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedResident.households.street_purok}, {selectedResident.households.barangay}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input
                  value={editForm.middle_name}
                  onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Suffix</Label>
                <Input
                  value={editForm.suffix}
                  onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateResident} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resident</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingResident ? getFullName(deletingResident) : "this resident"}? 
              They can be restored later from the deleted list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteResident} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentsTab;

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Home,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Loader2,
  Plus,
  Trash2,
  Save,
  X,
  UserPlus,
  Crown,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  members?: Resident[];
  head?: Resident | null;
}

interface Resident {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  birth_date: string | null;
  gender: string | null;
  contact_number: string | null;
  relation_to_head: string | null;
  is_head_of_household: boolean | null;
  household_id: string | null;
}

interface HouseholdFormData {
  household_number: string;
  house_number: string;
  street_purok: string;
  district: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  place_of_origin: string;
  ethnic_group: string;
  years_staying: string;
  house_ownership: string;
  lot_ownership: string;
  dwelling_type: string;
  lighting_source: string;
  water_supply_level: string;
}

const ITEMS_PER_PAGE = 10;

const PUROK_OPTIONS = [
  "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5",
  "Purok 6", "Purok 7", "Purok 8", "Purok 9", "Purok 10",
];

const DWELLING_TYPES = [
  "Single House", "Duplex", "Apartment", "Condominium", "Townhouse",
  "Makeshift/Barong-barong", "Other",
];

const OWNERSHIP_OPTIONS = ["Owned", "Rented", "Rent-free with consent", "Rent-free without consent", "Other"];

const emptyFormData: HouseholdFormData = {
  household_number: "",
  house_number: "",
  street_purok: "",
  district: "",
  address: "",
  barangay: "Sample Barangay",
  city: "Sample City",
  province: "Sample Province",
  place_of_origin: "",
  ethnic_group: "",
  years_staying: "",
  house_ownership: "",
  lot_ownership: "",
  dwelling_type: "",
  lighting_source: "",
  water_supply_level: "",
};

const HouseholdsTab = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [purokFilter, setPurokFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [householdToDelete, setHouseholdToDelete] = useState<Household | null>(null);
  const [formData, setFormData] = useState<HouseholdFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);

  const loadHouseholds = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;

      // Use RPC function to bypass RLS (staff use custom auth, not Supabase Auth)
      const { data, error } = await supabase.rpc("get_households_paginated_for_staff", {
        p_search: searchQuery || null,
        p_purok_filter: purokFilter === "all" ? null : purokFilter,
        p_limit: ITEMS_PER_PAGE,
        p_offset: from,
      });

      if (error) throw error;

      const totalCount = data?.[0]?.total_count || 0;

      // Fetch members for each household using RPC
      const householdsWithMembers = await Promise.all(
        (data || []).map(async (household: any) => {
          const { data: members } = await supabase.rpc("get_all_residents_for_staff");
          
          const householdMembers = (members || []).filter((m: any) => m.household_id === household.id);
          const head = householdMembers.find((m: any) => m.is_head_of_household) || null;

          return {
            ...household,
            members: householdMembers,
            head,
          } as Household;
        })
      );

      setHouseholds(householdsWithMembers);
      setTotalCount(Number(totalCount));
    } catch (error) {
      console.error("Error loading households:", error);
      toast.error("Failed to load households");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, purokFilter, currentPage]);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadHouseholds();
  };

  const getFullName = (resident: Resident | null | undefined) => {
    if (!resident) return "N/A";
    const parts = [resident.first_name];
    if (resident.middle_name) parts.push(resident.middle_name);
    parts.push(resident.last_name);
    if (resident.suffix) parts.push(resident.suffix);
    return parts.join(" ");
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const generateHouseholdNumber = async () => {
    const { count } = await supabase
      .from("households")
      .select("*", { count: "exact", head: true });
    const nextNum = (count || 0) + 1;
    return `HH-${String(nextNum).padStart(5, "0")}`;
  };

  const handleViewHousehold = (household: Household) => {
    setSelectedHousehold(household);
    setShowViewDialog(true);
  };

  const handleCreateHousehold = async () => {
    const newNumber = await generateHouseholdNumber();
    setFormData({ ...emptyFormData, household_number: newNumber });
    setEditingHousehold(null);
    setShowFormDialog(true);
  };

  const handleEditHousehold = (household: Household) => {
    setEditingHousehold(household);
    setFormData({
      household_number: household.household_number,
      house_number: household.house_number || "",
      street_purok: household.street_purok || "",
      district: household.district || "",
      address: household.address || "",
      barangay: household.barangay || "Sample Barangay",
      city: household.city || "Sample City",
      province: household.province || "Sample Province",
      place_of_origin: household.place_of_origin || "",
      ethnic_group: household.ethnic_group || "",
      years_staying: household.years_staying?.toString() || "",
      house_ownership: household.house_ownership || "",
      lot_ownership: household.lot_ownership || "",
      dwelling_type: household.dwelling_type || "",
      lighting_source: household.lighting_source || "",
      water_supply_level: household.water_supply_level || "",
    });
    setShowFormDialog(true);
  };

  const handleSaveHousehold = async () => {
    if (!formData.household_number.trim()) {
      toast.error("Household number is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingHousehold) {
        // Use RPC function for update
        const { error } = await supabase.rpc("staff_update_household", {
          p_household_id: editingHousehold.id,
          p_household_number: formData.household_number.trim(),
          p_house_number: formData.house_number.trim() || null,
          p_street_purok: formData.street_purok.trim() || null,
          p_district: formData.district.trim() || null,
          p_address: formData.address.trim() || null,
          p_barangay: formData.barangay.trim() || null,
          p_city: formData.city.trim() || null,
          p_province: formData.province.trim() || null,
          p_place_of_origin: formData.place_of_origin.trim() || null,
          p_ethnic_group: formData.ethnic_group.trim() || null,
          p_years_staying: formData.years_staying ? parseInt(formData.years_staying) : null,
          p_house_ownership: formData.house_ownership || null,
          p_lot_ownership: formData.lot_ownership || null,
          p_dwelling_type: formData.dwelling_type || null,
          p_lighting_source: formData.lighting_source || null,
          p_water_supply_level: formData.water_supply_level || null,
        });

        if (error) throw error;
        toast.success("Household updated successfully");
      } else {
        // Use RPC function for insert
        const { error } = await supabase.rpc("staff_create_household", {
          p_household_number: formData.household_number.trim(),
          p_house_number: formData.house_number.trim() || null,
          p_street_purok: formData.street_purok.trim() || null,
          p_district: formData.district.trim() || null,
          p_address: formData.address.trim() || null,
          p_barangay: formData.barangay.trim() || null,
          p_city: formData.city.trim() || null,
          p_province: formData.province.trim() || null,
          p_place_of_origin: formData.place_of_origin.trim() || null,
          p_ethnic_group: formData.ethnic_group.trim() || null,
          p_years_staying: formData.years_staying ? parseInt(formData.years_staying) : null,
          p_house_ownership: formData.house_ownership || null,
          p_lot_ownership: formData.lot_ownership || null,
          p_dwelling_type: formData.dwelling_type || null,
          p_lighting_source: formData.lighting_source || null,
          p_water_supply_level: formData.water_supply_level || null,
        });

        if (error) throw error;
        toast.success("Household created successfully");
      }

      setShowFormDialog(false);
      setEditingHousehold(null);
      setFormData(emptyFormData);
      loadHouseholds();
    } catch (error: any) {
      console.error("Error saving household:", error);
      toast.error(error.message || "Failed to save household");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!householdToDelete) return;

    try {
      // Use RPC function for delete (handles unassigning residents)
      const { error } = await supabase.rpc("staff_delete_household", {
        p_household_id: householdToDelete.id,
      });

      if (error) throw error;

      toast.success("Household deleted successfully");
      setShowDeleteDialog(false);
      setHouseholdToDelete(null);
      loadHouseholds();
    } catch (error: any) {
      console.error("Error deleting household:", error);
      toast.error(error.message || "Failed to delete household");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Household Management
          </CardTitle>
          <Button onClick={handleCreateHousehold}>
            <Plus className="h-4 w-4 mr-2" />
            Add Household
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by household number or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={purokFilter} onValueChange={setPurokFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Purok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purok</SelectItem>
              {PUROK_OPTIONS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : households.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-lg mb-2">No Households Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "No households match your search criteria." : "No households in the system yet."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Household #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {households.map((household) => (
                    <TableRow key={household.id}>
                      <TableCell className="font-medium">{household.household_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{household.street_purok || household.address || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {household.head ? (
                          <div className="flex items-center gap-1">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            {getFullName(household.head)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No head assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {household.members?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewHousehold(household)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditHousehold(household)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHouseholdToDelete(household);
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
      </CardContent>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Household Details</DialogTitle>
          </DialogHeader>
          {selectedHousehold && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Household Number</Label>
                  <p className="font-medium">{selectedHousehold.household_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedHousehold.street_purok}, {selectedHousehold.barangay}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Head of Household</Label>
                  <p>{getFullName(selectedHousehold.head)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Members</Label>
                  <p>{selectedHousehold.members?.length || 0} members</p>
                </div>
              </div>
              {selectedHousehold.members && selectedHousehold.members.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Household Members</Label>
                    <ul className="mt-2 space-y-1">
                      {selectedHousehold.members.map(m => (
                        <li key={m.id} className="flex items-center gap-2">
                          {m.is_head_of_household && <Crown className="h-4 w-4 text-yellow-500" />}
                          {getFullName(m)}
                          {m.relation_to_head && <span className="text-muted-foreground text-sm">({m.relation_to_head})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHousehold ? "Edit Household" : "Add Household"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Household Number *</Label>
                <Input
                  value={formData.household_number}
                  onChange={(e) => setFormData({ ...formData, household_number: e.target.value })}
                  disabled={!!editingHousehold}
                />
              </div>
              <div className="space-y-2">
                <Label>House Number</Label>
                <Input
                  value={formData.house_number}
                  onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Street/Purok</Label>
                <Select value={formData.street_purok} onValueChange={(v) => setFormData({ ...formData, street_purok: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Purok" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUROK_OPTIONS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>House Ownership</Label>
                <Select value={formData.house_ownership} onValueChange={(v) => setFormData({ ...formData, house_ownership: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERSHIP_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dwelling Type</Label>
                <Select value={formData.dwelling_type} onValueChange={(v) => setFormData({ ...formData, dwelling_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DWELLING_TYPES.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Years Staying</Label>
                <Input
                  type="number"
                  value={formData.years_staying}
                  onChange={(e) => setFormData({ ...formData, years_staying: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveHousehold} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingHousehold ? "Save Changes" : "Create Household"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Household</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete household {householdToDelete?.household_number}? 
              All members will be unlinked from this household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHousehold} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default HouseholdsTab;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  UserMinus,
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
  toilet_facilities: string[];
  drainage_facilities: string[];
  garbage_disposal: string[];
  water_storage: string[];
  food_storage_type: string[];
  communication_services: string[];
  means_of_transport: string[];
  info_sources: string[];
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
  toilet_facilities: string[];
  drainage_facilities: string[];
  garbage_disposal: string[];
  water_storage: string[];
  food_storage_type: string[];
  communication_services: string[];
  means_of_transport: string[];
  info_sources: string[];
}

const ITEMS_PER_PAGE = 10;

const PUROK_OPTIONS = [
  "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5",
  "Purok 6", "Purok 7", "Purok 8", "Purok 9", "Purok 10",
  "Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5",
];

const DWELLING_TYPES = [
  "Single House", "Duplex", "Apartment", "Condominium", "Townhouse",
  "Makeshift/Barong-barong", "Institutional Living Quarter", "Other",
];

const OWNERSHIP_OPTIONS = ["Owned", "Rented", "Rent-free with consent", "Rent-free without consent", "Other"];

const LIGHTING_OPTIONS = ["Electric", "Kerosene/Gas", "Solar", "Candle", "None", "Other"];

const WATER_SUPPLY_OPTIONS = ["Level I (Point Source)", "Level II (Communal)", "Level III (Individual Connection)", "Other"];

const MULTI_SELECT_OPTIONS = {
  toilet_facilities: ["Water-sealed", "Open Pit", "Closed Pit", "None", "Shared"],
  drainage_facilities: ["Closed Drainage", "Open Drainage", "None"],
  garbage_disposal: ["Collected by Truck", "Composting", "Burning", "Open Pit", "Recycling"],
  water_storage: ["Faucet", "Well", "Pump", "Spring", "Rainwater"],
  food_storage_type: ["Refrigerator", "Cabinet", "Container", "None"],
  communication_services: ["Cellphone", "Landline", "Internet", "Radio", "Television"],
  means_of_transport: ["Private Vehicle", "Motorcycle", "Bicycle", "Public Transport", "Walking"],
  info_sources: ["TV", "Radio", "Internet", "Newspaper", "Social Media", "Neighbors"],
};

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
  toilet_facilities: [],
  drainage_facilities: [],
  garbage_disposal: [],
  water_storage: [],
  food_storage_type: [],
  communication_services: [],
  means_of_transport: [],
  info_sources: [],
};

const StaffHouseholds = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [purokFilter, setPurokFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showLinkResidentDialog, setShowLinkResidentDialog] = useState(false);

  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null);
  const [householdToDelete, setHouseholdToDelete] = useState<Household | null>(null);
  const [formData, setFormData] = useState<HouseholdFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Link resident states
  const [availableResidents, setAvailableResidents] = useState<Resident[]>([]);
  const [residentSearchQuery, setResidentSearchQuery] = useState("");
  const [selectedResidentToLink, setSelectedResidentToLink] = useState<string | null>(null);

  // Auth is now handled by ProtectedRoute wrapper

  const loadHouseholds = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("households")
        .select("*", { count: "exact" });

      if (searchQuery) {
        query = query.or(`household_number.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,street_purok.ilike.%${searchQuery}%`);
      }

      if (purokFilter && purokFilter !== "all") {
        query = query.ilike("street_purok", `%${purokFilter}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("household_number", { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Fetch members and head for each household
      const householdsWithMembers = await Promise.all(
        (data || []).map(async (household) => {
          const { data: members } = await supabase
            .from("residents")
            .select("id, first_name, middle_name, last_name, suffix, birth_date, gender, contact_number, relation_to_head, is_head_of_household, household_id")
            .eq("household_id", household.id);

          const head = members?.find((m) => m.is_head_of_household) || null;

          return {
            ...household,
            toilet_facilities: (household.toilet_facilities as string[]) || [],
            drainage_facilities: (household.drainage_facilities as string[]) || [],
            garbage_disposal: (household.garbage_disposal as string[]) || [],
            water_storage: (household.water_storage as string[]) || [],
            food_storage_type: (household.food_storage_type as string[]) || [],
            communication_services: (household.communication_services as string[]) || [],
            means_of_transport: (household.means_of_transport as string[]) || [],
            info_sources: (household.info_sources as string[]) || [],
            members: members || [],
            head,
          } as Household;
        })
      );

      setHouseholds(householdsWithMembers);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading households:", error);
      toast.error("Failed to load households");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, purokFilter, currentPage]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHouseholds();
    }
  }, [isAuthenticated, loadHouseholds]);

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

  // Generate household number
  const generateHouseholdNumber = async () => {
    const { count } = await supabase
      .from("households")
      .select("*", { count: "exact", head: true });
    const nextNum = (count || 0) + 1;
    return `HH-${String(nextNum).padStart(5, "0")}`;
  };

  // View household details
  const handleViewHousehold = (household: Household) => {
    setSelectedHousehold(household);
    setShowViewDialog(true);
  };

  // Open create form
  const handleCreateHousehold = async () => {
    const newNumber = await generateHouseholdNumber();
    setFormData({ ...emptyFormData, household_number: newNumber });
    setEditingHousehold(null);
    setShowFormDialog(true);
  };

  // Open edit form
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
      toilet_facilities: household.toilet_facilities || [],
      drainage_facilities: household.drainage_facilities || [],
      garbage_disposal: household.garbage_disposal || [],
      water_storage: household.water_storage || [],
      food_storage_type: household.food_storage_type || [],
      communication_services: household.communication_services || [],
      means_of_transport: household.means_of_transport || [],
      info_sources: household.info_sources || [],
    });
    setShowFormDialog(true);
  };

  // Save household (create or update)
  const handleSaveHousehold = async () => {
    if (!formData.household_number.trim()) {
      toast.error("Household number is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        household_number: formData.household_number.trim(),
        house_number: formData.house_number.trim() || null,
        street_purok: formData.street_purok.trim() || null,
        district: formData.district.trim() || null,
        address: formData.address.trim() || null,
        barangay: formData.barangay.trim() || null,
        city: formData.city.trim() || null,
        province: formData.province.trim() || null,
        place_of_origin: formData.place_of_origin.trim() || null,
        ethnic_group: formData.ethnic_group.trim() || null,
        years_staying: formData.years_staying ? parseInt(formData.years_staying) : null,
        house_ownership: formData.house_ownership || null,
        lot_ownership: formData.lot_ownership || null,
        dwelling_type: formData.dwelling_type || null,
        lighting_source: formData.lighting_source || null,
        water_supply_level: formData.water_supply_level || null,
        toilet_facilities: formData.toilet_facilities,
        drainage_facilities: formData.drainage_facilities,
        garbage_disposal: formData.garbage_disposal,
        water_storage: formData.water_storage,
        food_storage_type: formData.food_storage_type,
        communication_services: formData.communication_services,
        means_of_transport: formData.means_of_transport,
        info_sources: formData.info_sources,
      };

      if (editingHousehold) {
        const { error } = await supabase
          .from("households")
          .update(payload)
          .eq("id", editingHousehold.id);

        if (error) throw error;
        toast.success("Household updated successfully");
      } else {
        const { error } = await supabase.from("households").insert(payload);
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

  // Delete household
  const handleDeleteHousehold = async () => {
    if (!householdToDelete) return;

    try {
      // First, unlink all residents
      await supabase
        .from("residents")
        .update({ household_id: null, is_head_of_household: false })
        .eq("household_id", householdToDelete.id);

      // Then delete household
      const { error } = await supabase
        .from("households")
        .delete()
        .eq("id", householdToDelete.id);

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

  // Manage members
  const handleManageMembers = (household: Household) => {
    setSelectedHousehold(household);
    setShowMembersDialog(true);
  };

  // Load available residents (those without a household)
  const loadAvailableResidents = async () => {
    try {
      let query = supabase
        .from("residents")
        .select("id, first_name, middle_name, last_name, suffix, birth_date, gender, contact_number, relation_to_head, is_head_of_household, household_id")
        .is("household_id", null);

      if (residentSearchQuery) {
        query = query.or(`first_name.ilike.%${residentSearchQuery}%,last_name.ilike.%${residentSearchQuery}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      setAvailableResidents(data || []);
    } catch (error) {
      console.error("Error loading available residents:", error);
    }
  };

  // Open link resident dialog
  const handleOpenLinkResident = async () => {
    setResidentSearchQuery("");
    setSelectedResidentToLink(null);
    await loadAvailableResidents();
    setShowLinkResidentDialog(true);
  };

  // Link resident to household
  const handleLinkResident = async () => {
    if (!selectedHousehold || !selectedResidentToLink) return;

    try {
      const { error } = await supabase
        .from("residents")
        .update({ household_id: selectedHousehold.id })
        .eq("id", selectedResidentToLink);

      if (error) throw error;

      toast.success("Resident linked to household");
      setShowLinkResidentDialog(false);
      setSelectedResidentToLink(null);
      
      // Refresh household data
      const { data: updatedMembers } = await supabase
        .from("residents")
        .select("id, first_name, middle_name, last_name, suffix, birth_date, gender, contact_number, relation_to_head, is_head_of_household, household_id")
        .eq("household_id", selectedHousehold.id);

      setSelectedHousehold({
        ...selectedHousehold,
        members: updatedMembers || [],
        head: updatedMembers?.find((m) => m.is_head_of_household) || null,
      });
      loadHouseholds();
    } catch (error: any) {
      console.error("Error linking resident:", error);
      toast.error(error.message || "Failed to link resident");
    }
  };

  // Unlink resident from household
  const handleUnlinkResident = async (residentId: string) => {
    if (!selectedHousehold) return;

    try {
      const { error } = await supabase
        .from("residents")
        .update({ household_id: null, is_head_of_household: false })
        .eq("id", residentId);

      if (error) throw error;

      toast.success("Resident unlinked from household");
      
      // Refresh household data
      const { data: updatedMembers } = await supabase
        .from("residents")
        .select("id, first_name, middle_name, last_name, suffix, birth_date, gender, contact_number, relation_to_head, is_head_of_household, household_id")
        .eq("household_id", selectedHousehold.id);

      setSelectedHousehold({
        ...selectedHousehold,
        members: updatedMembers || [],
        head: updatedMembers?.find((m) => m.is_head_of_household) || null,
      });
      loadHouseholds();
    } catch (error: any) {
      console.error("Error unlinking resident:", error);
      toast.error(error.message || "Failed to unlink resident");
    }
  };

  // Set resident as head of household
  const handleSetAsHead = async (residentId: string) => {
    if (!selectedHousehold) return;

    try {
      // First, remove head status from all members
      await supabase
        .from("residents")
        .update({ is_head_of_household: false })
        .eq("household_id", selectedHousehold.id);

      // Then set the selected resident as head
      const { error } = await supabase
        .from("residents")
        .update({ is_head_of_household: true, relation_to_head: "Head" })
        .eq("id", residentId);

      if (error) throw error;

      toast.success("Household head updated");
      
      // Refresh household data
      const { data: updatedMembers } = await supabase
        .from("residents")
        .select("id, first_name, middle_name, last_name, suffix, birth_date, gender, contact_number, relation_to_head, is_head_of_household, household_id")
        .eq("household_id", selectedHousehold.id);

      setSelectedHousehold({
        ...selectedHousehold,
        members: updatedMembers || [],
        head: updatedMembers?.find((m) => m.is_head_of_household) || null,
      });
      loadHouseholds();
    } catch (error: any) {
      console.error("Error setting head:", error);
      toast.error(error.message || "Failed to set household head");
    }
  };

  // Multi-select handler
  const handleMultiSelectChange = (field: keyof HouseholdFormData, value: string, checked: boolean) => {
    const currentValues = formData[field] as string[];
    if (checked) {
      setFormData({ ...formData, [field]: [...currentValues, value] });
    } else {
      setFormData({ ...formData, [field]: currentValues.filter((v) => v !== value) });
    }
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/staff-dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Household Management</h1>
                <p className="text-sm text-muted-foreground">Manage household census data</p>
              </div>
            </div>
            <Button onClick={handleCreateHousehold}>
              <Plus className="h-4 w-4 mr-2" />
              Add Household
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by household number or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <Select value={purokFilter} onValueChange={(value) => { setPurokFilter(value); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by Purok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Puroks/Zones</SelectItem>
              {PUROK_OPTIONS.map((purok) => (
                <SelectItem key={purok} value={purok}>{purok}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>{totalCount} households</span>
          </div>
        </div>

        {/* Households Table */}
        <Card>
          <CardHeader>
            <CardTitle>Households List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : households.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No households found</p>
                <p className="text-sm">Create a new household to get started</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {households.map((household) => (
                    <Card key={household.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Badge variant="outline" className="mb-2">{household.household_number}</Badge>
                          <p className="font-medium">{getFullName(household.head)}</p>
                          <p className="text-sm text-muted-foreground">Head of Household</p>
                        </div>
                        <Badge>{household.members?.length || 0} members</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-3 w-3" />
                        {household.street_purok || household.address || "No address"}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewHousehold(household)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleManageMembers(household)}>
                          <Users className="h-4 w-4 mr-1" /> Members
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditHousehold(household)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setHouseholdToDelete(household); setShowDeleteDialog(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Household #</TableHead>
                      <TableHead>Head of Household</TableHead>
                      <TableHead>Purok/Zone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {households.map((household) => (
                      <TableRow key={household.id}>
                        <TableCell>
                          <Badge variant="outline">{household.household_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Home className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{getFullName(household.head)}</p>
                              <p className="text-xs text-muted-foreground">
                                {household.head?.contact_number || "No contact"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {household.street_purok || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm max-w-[200px] truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {household.address || `${household.house_number || ""} ${household.district || ""}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{household.members?.length || 0} members</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewHousehold(household)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleManageMembers(household)}>
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditHousehold(household)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setHouseholdToDelete(household); setShowDeleteDialog(true); }}>
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
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* View Household Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Household Details</DialogTitle>
            <DialogDescription>
              {selectedHousehold?.household_number}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedHousehold && (
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="housing">Housing</TabsTrigger>
                  <TabsTrigger value="utilities">Utilities</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Household Number</Label>
                      <p className="font-medium">{selectedHousehold.household_number}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Years Staying</Label>
                      <p className="font-medium">{selectedHousehold.years_staying || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">House Number</Label>
                      <p className="font-medium">{selectedHousehold.house_number || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Street/Purok</Label>
                      <p className="font-medium">{selectedHousehold.street_purok || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">District</Label>
                      <p className="font-medium">{selectedHousehold.district || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{selectedHousehold.address || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Barangay</Label>
                      <p className="font-medium">{selectedHousehold.barangay || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">City/Province</Label>
                      <p className="font-medium">{selectedHousehold.city}, {selectedHousehold.province}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Place of Origin</Label>
                      <p className="font-medium">{selectedHousehold.place_of_origin || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ethnic Group</Label>
                      <p className="font-medium">{selectedHousehold.ethnic_group || "N/A"}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="housing" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">House Ownership</Label>
                      <p className="font-medium">{selectedHousehold.house_ownership || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Lot Ownership</Label>
                      <p className="font-medium">{selectedHousehold.lot_ownership || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Dwelling Type</Label>
                      <p className="font-medium">{selectedHousehold.dwelling_type || "N/A"}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="utilities" className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Lighting Source</Label>
                      <p className="font-medium">{selectedHousehold.lighting_source || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Water Supply Level</Label>
                      <p className="font-medium">{selectedHousehold.water_supply_level || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Toilet Facilities</Label>
                      <p className="font-medium">{selectedHousehold.toilet_facilities?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Water Storage</Label>
                      <p className="font-medium">{selectedHousehold.water_storage?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Garbage Disposal</Label>
                      <p className="font-medium">{selectedHousehold.garbage_disposal?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Communication Services</Label>
                      <p className="font-medium">{selectedHousehold.communication_services?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Transport</Label>
                      <p className="font-medium">{selectedHousehold.means_of_transport?.join(", ") || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Info Sources</Label>
                      <p className="font-medium">{selectedHousehold.info_sources?.join(", ") || "N/A"}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="members" className="p-4">
                  <div className="space-y-3">
                    {selectedHousehold.members?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No members linked to this household</p>
                    ) : (
                      selectedHousehold.members?.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{getFullName(member)}</p>
                              <p className="text-sm text-muted-foreground">
                                {member.relation_to_head || "Member"}
                              </p>
                            </div>
                          </div>
                          {member.is_head_of_household && (
                            <Badge><Crown className="h-3 w-3 mr-1" />Head</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingHousehold ? "Edit Household" : "Create New Household"}</DialogTitle>
            <DialogDescription>
              {editingHousehold ? "Update household information" : "Fill in the household details"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="housing">Housing</TabsTrigger>
                <TabsTrigger value="utilities">Utilities</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Household Number *</Label>
                    <Input
                      value={formData.household_number}
                      onChange={(e) => setFormData({ ...formData, household_number: e.target.value })}
                      placeholder="HH-00001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Years Staying</Label>
                    <Input
                      type="number"
                      value={formData.years_staying}
                      onChange={(e) => setFormData({ ...formData, years_staying: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>House Number</Label>
                    <Input
                      value={formData.house_number}
                      onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                      placeholder="e.g., 123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Street/Purok</Label>
                    <Select value={formData.street_purok} onValueChange={(value) => setFormData({ ...formData, street_purok: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Purok/Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {PUROK_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="District name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Complete address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Barangay</Label>
                    <Input
                      value={formData.barangay}
                      onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Input
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Place of Origin</Label>
                    <Input
                      value={formData.place_of_origin}
                      onChange={(e) => setFormData({ ...formData, place_of_origin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ethnic Group</Label>
                    <Input
                      value={formData.ethnic_group}
                      onChange={(e) => setFormData({ ...formData, ethnic_group: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="housing" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>House Ownership</Label>
                    <Select value={formData.house_ownership} onValueChange={(value) => setFormData({ ...formData, house_ownership: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lot Ownership</Label>
                    <Select value={formData.lot_ownership} onValueChange={(value) => setFormData({ ...formData, lot_ownership: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Dwelling Type</Label>
                    <Select value={formData.dwelling_type} onValueChange={(value) => setFormData({ ...formData, dwelling_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dwelling type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DWELLING_TYPES.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="utilities" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lighting Source</Label>
                    <Select value={formData.lighting_source} onValueChange={(value) => setFormData({ ...formData, lighting_source: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lighting" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHTING_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Water Supply Level</Label>
                    <Select value={formData.water_supply_level} onValueChange={(value) => setFormData({ ...formData, water_supply_level: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select water supply" />
                      </SelectTrigger>
                      <SelectContent>
                        {WATER_SUPPLY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Toilet Facilities</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.toilet_facilities.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.toilet_facilities.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("toilet_facilities", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Water Storage</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.water_storage.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.water_storage.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("water_storage", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Drainage Facilities</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.drainage_facilities.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.drainage_facilities.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("drainage_facilities", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Garbage Disposal</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.garbage_disposal.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.garbage_disposal.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("garbage_disposal", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="services" className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Communication Services</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.communication_services.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.communication_services.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("communication_services", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Means of Transport</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.means_of_transport.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.means_of_transport.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("means_of_transport", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Food Storage Type</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.food_storage_type.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.food_storage_type.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("food_storage_type", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Information Sources</Label>
                    <div className="border rounded-md p-3 space-y-2">
                      {MULTI_SELECT_OPTIONS.info_sources.map((option) => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.info_sources.includes(option)}
                            onCheckedChange={(checked) => handleMultiSelectChange("info_sources", option, checked as boolean)}
                          />
                          <label className="text-sm">{option}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSaveHousehold} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingHousehold ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Household Members</DialogTitle>
            <DialogDescription>
              {selectedHousehold?.household_number} - Link/unlink residents and set household head
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button onClick={handleOpenLinkResident} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" /> Link Existing Resident
            </Button>
            <Separator />
            <div className="space-y-3">
              <Label>Current Members ({selectedHousehold?.members?.length || 0})</Label>
              {selectedHousehold?.members?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                selectedHousehold?.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{getFullName(member)}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.relation_to_head || "Member"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.is_head_of_household ? (
                        <Badge><Crown className="h-3 w-3 mr-1" />Head</Badge>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleSetAsHead(member.id)}>
                          <Crown className="h-4 w-4 mr-1" /> Set as Head
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleUnlinkResident(member.id)}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Resident Dialog */}
      <Dialog open={showLinkResidentDialog} onOpenChange={setShowLinkResidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Resident to Household</DialogTitle>
            <DialogDescription>
              Search and select a resident without a household
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name..."
                value={residentSearchQuery}
                onChange={(e) => setResidentSearchQuery(e.target.value)}
              />
              <Button onClick={loadAvailableResidents}>Search</Button>
            </div>
            <ScrollArea className="h-[200px] border rounded-md">
              {availableResidents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No available residents found</p>
              ) : (
                <div className="p-2 space-y-2">
                  {availableResidents.map((resident) => (
                    <div
                      key={resident.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedResidentToLink === resident.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedResidentToLink(resident.id)}
                    >
                      <p className="font-medium">{getFullName(resident)}</p>
                      <p className="text-sm text-muted-foreground">
                        {resident.gender || "N/A"} • {resident.contact_number || "No contact"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkResidentDialog(false)}>Cancel</Button>
            <Button onClick={handleLinkResident} disabled={!selectedResidentToLink}>
              Link Resident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Household?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete household <strong>{householdToDelete?.household_number}</strong> and unlink all its members. This action cannot be undone.
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
    </div>
  );
};

export default StaffHouseholds;

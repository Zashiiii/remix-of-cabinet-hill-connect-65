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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access this page");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadResidents = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("residents")
        .select(`
          *,
          households (*)
        `, { count: "exact" });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,contact_number.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query
        .order("last_name", { ascending: true })
        .range(from, to);

      if (error) throw error;

      setResidents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading residents:", error);
      toast.error("Failed to load residents");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentPage]);

  useEffect(() => {
    if (isAuthenticated) {
      loadResidents();
    }
  }, [isAuthenticated, loadResidents]);

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

        {/* Residents Table */}
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProfile(resident)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
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
      </main>

      {/* Full Census Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Resident Census Profile
            </DialogTitle>
            <DialogDescription>
              Complete census information for {selectedResident && getFullName(selectedResident)}
            </DialogDescription>
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

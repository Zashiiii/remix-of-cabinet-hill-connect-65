import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Users, 
  Home, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Download, 
  Printer, 
  Loader2,
  RefreshCw,
  Eye,
  ClipboardCheck,
  FileWarning,
  Save,
  Calendar,
  Zap,
  GraduationCap,
  Heart,
  Leaf,
  Stethoscope,
  Building2,
  Phone,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBarangayStats } from "@/context/BarangayStatsContext";
import { toast } from "sonner";
import { format } from "date-fns";

// Types for household and resident data
interface HouseholdData {
  id: string;
  household_number: string;
  address: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  house_number: string | null;
  street_purok: string | null;
  district: string | null;
  years_staying: number | null;
  place_of_origin: string | null;
  ethnic_group: string | null;
  house_ownership: string | null;
  lot_ownership: string | null;
  dwelling_type: string | null;
  lighting_source: string | null;
  water_supply_level: string | null;
  water_storage: string[] | null;
  food_storage_type: string[] | null;
  toilet_facilities: string[] | null;
  drainage_facilities: string[] | null;
  garbage_disposal: string[] | null;
  communication_services: string[] | null;
  means_of_transport: string[] | null;
  info_sources: string[] | null;
  interview_date: string | null;
  residents?: ResidentData[];
}

interface ResidentData {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  gender: string | null;
  birth_date: string | null;
  civil_status: string | null;
  religion: string | null;
  relation_to_head: string | null;
  is_head_of_household: boolean | null;
  schooling_status: string | null;
  education_attainment: string | null;
  employment_status: string | null;
  employment_category: string | null;
  occupation: string | null;
  monthly_income_cash: string | null;
  monthly_income_kind: string | null;
  dialects_spoken: string[] | null;
  ethnic_group: string | null;
  place_of_origin: string | null;
  livelihood_training: string | null;
}

interface IncidentSummary {
  total: number;
  byType: { [key: string]: number };
  resolved: number;
  pending: number;
}

interface ValidationWarning {
  field: string;
  message: string;
  severity: "error" | "warning";
  householdId?: string;
}

// Census form tabs
const CENSUS_TABS = [
  { id: "basic-info", label: "Basic Info", icon: FileText },
  { id: "housing", label: "Housing", icon: Home },
  { id: "services", label: "Services", icon: Zap },
  { id: "education-health", label: "Education & Health", icon: GraduationCap },
  { id: "household-members", label: "Household Members", icon: Users },
  { id: "environmental", label: "Environmental", icon: Leaf },
  { id: "health-info", label: "Health Info", icon: Stethoscope },
];

// Options for form fields
const DIALECTS = ["Filipino", "Ilongo", "Tagalog", "Waray", "Bicolano", "Cebuano", "Ilocano", "Others"];
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
const RELIGIONS = ["Roman Catholic", "Protestant", "Iglesia ni Cristo", "Islam", "Buddhist", "Others"];
const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Divorced", "Live-in"];
const RELATION_TO_HEAD = ["Head", "Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandchild", "In-law", "Relative", "Helper", "Boarder", "Others"];
const SCHOOLING_STATUSES = ["In School", "Out of School", "Not Yet in School", "Graduate"];
const EDUCATION_LEVELS = ["No Formal Education", "Pre-school", "Elementary", "High School", "Vocational", "College", "Post Graduate"];
const EMPLOYMENT_STATUSES = ["Employed", "Unemployed", "Self-employed", "Student", "Retired", "Housewife/Househusband"];
const EMPLOYMENT_CATEGORIES = ["Private", "Government", "Self Employed", "OFW", "Others"];
const INCOME_RANGES = ["3,000 & below", "3,001-4,999", "5,000-6,999", "7,000-8,999", "9,000-10,999", "11,000-14,999", "15,000-19,999", "20,000 & above"];
const FAMILY_PLANNING_TYPES = ["Pills", "IUD", "Condom", "Injectable", "Implant", "BTL", "Vasectomy", "Natural", "Others"];

const EcologicalProfileTab = () => {
  // Get synchronized stats from context
  const { 
    totalResidents, 
    totalHouseholds, 
    maleCount, 
    femaleCount, 
    refreshStats: refreshGlobalStats 
  } = useBarangayStats();

  const [isLoading, setIsLoading] = useState(true);
  const [households, setHouseholds] = useState<HouseholdData[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdData | null>(null);
  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary>({ total: 0, byType: {}, resolved: 0, pending: 0 });
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("basic-info");
  
  // Sort state for households table
  const [sortField, setSortField] = useState<'household_number' | 'address' | 'members' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Census form state
  const [censusData, setCensusData] = useState({
    interviewDate: format(new Date(), "yyyy-MM-dd"),
    respondentName: "",
    respondentRelation: "",
    // Health data
    healthData: {
      malnutrition_0_11: { first: 0, second: 0 },
      malnutrition_1_4: { first: 0, second: 0 },
      malnutrition_5_7: { first: 0, second: 0 },
    },
    // Immunization data
    immunizationData: {
      bornAlive: { registered: 0, notRegistered: 0 },
      bornDead: { registered: 0, notRegistered: 0 },
      stillBirth: { registered: 0, notRegistered: 0 },
    },
    // Education data (by numbers in household)
    educationData: {
      preschool: { graduate: 0, undergraduate: 0 },
      primary: { graduate: 0, undergraduate: 0 },
      secondary: { graduate: 0, undergraduate: 0 },
      vocational: { graduate: 0, undergraduate: 0 },
      college: { graduate: 0, undergraduate: 0 },
      postGraduate: { graduate: 0, undergraduate: 0 },
    },
    // Family planning
    familyPlanning: {
      isAcceptor: false,
      type: "",
      otherType: "",
    },
    // Pregnant women data
    pregnantData: {
      count: 0,
      highRiskCount: 0,
    },
    // Disability data
    disabilityData: {
      physical: 0,
      mental: 0,
      visual: 0,
      hearing: 0,
      speech: 0,
    },
    // Senior citizens data
    seniorData: {
      count: 0,
      withPension: 0,
    },
    // Solo parent data
    soloParentCount: 0,
    // PWD data
    pwdCount: 0,
    // 4Ps beneficiary
    is4PsBeneficiary: false,
    // Death records
    deathData: {
      infant: 0,
      maternal: 0,
      other: 0,
    },
    // Food production
    foodProduction: {
      vegetables: false,
      livestock: false,
      poultry: false,
      fishery: false,
      others: "",
    },
    // Pets/Animals
    animals: {
      dogs: 0,
      cats: 0,
      chickens: 0,
      pigs: 0,
      goats: 0,
      cows: 0,
      others: "",
    },
    // Additional notes
    additionalNotes: "",
  });

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch households using RPC function (bypasses RLS for staff)
      const { data: householdsData, error: householdsError } = await supabase.rpc(
        "get_all_households_for_staff"
      );

      if (householdsError) throw householdsError;

      // Fetch residents using RPC function
      const { data: residentsData, error: residentsError } = await supabase.rpc(
        "get_all_residents_for_staff"
      );

      if (residentsError) throw residentsError;

      // Group residents by household
      const householdsWithResidents = (householdsData || []).map((h: any) => ({
        ...h,
        water_storage: Array.isArray(h.water_storage) ? h.water_storage : [],
        food_storage_type: Array.isArray(h.food_storage_type) ? h.food_storage_type : [],
        toilet_facilities: Array.isArray(h.toilet_facilities) ? h.toilet_facilities : [],
        drainage_facilities: Array.isArray(h.drainage_facilities) ? h.drainage_facilities : [],
        garbage_disposal: Array.isArray(h.garbage_disposal) ? h.garbage_disposal : [],
        communication_services: Array.isArray(h.communication_services) ? h.communication_services : [],
        means_of_transport: Array.isArray(h.means_of_transport) ? h.means_of_transport : [],
        info_sources: Array.isArray(h.info_sources) ? h.info_sources : [],
        residents: (residentsData || [])
          .filter((r: any) => r.household_id === h.id)
          .map((r: any) => ({
            ...r,
            dialects_spoken: Array.isArray(r.dialects_spoken) ? r.dialects_spoken : [],
          })),
      })) as HouseholdData[];

      setHouseholds(householdsWithResidents);

      // Fetch incidents summary
      const { data: incidentsData, error: incidentsError } = await supabase.rpc("get_all_incidents_for_staff", {
        p_approval_status: "approved",
        p_status: null,
      });

      if (!incidentsError && incidentsData) {
        const byType: { [key: string]: number } = {};
        let resolved = 0;
        let pending = 0;

        incidentsData.forEach((incident: any) => {
          byType[incident.incident_type] = (byType[incident.incident_type] || 0) + 1;
          if (incident.status === "resolved" || incident.status === "closed") {
            resolved++;
          } else {
            pending++;
          }
        });

        setIncidentSummary({
          total: incidentsData.length,
          byType,
          resolved,
          pending,
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load census data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate age from birth date
  const calculateAge = (birthDate: string | null): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Get population statistics
  const getPopulationStats = () => {
    const allResidents = households.flatMap((h) => h.residents || []);
    const male = allResidents.filter((r) => r.gender?.toLowerCase() === "male").length;
    const female = allResidents.filter((r) => r.gender?.toLowerCase() === "female").length;
    
    const ageGroups = {
      "0-14": 0,
      "15-24": 0,
      "25-44": 0,
      "45-59": 0,
      "60+": 0,
    };

    allResidents.forEach((r) => {
      const age = calculateAge(r.birth_date);
      if (age <= 14) ageGroups["0-14"]++;
      else if (age <= 24) ageGroups["15-24"]++;
      else if (age <= 44) ageGroups["25-44"]++;
      else if (age <= 59) ageGroups["45-59"]++;
      else ageGroups["60+"]++;
    });

    return { total: allResidents.length, male, female, ageGroups };
  };

  // Filter households
  const filteredHouseholds = households.filter((h) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      h.household_number.toLowerCase().includes(searchLower) ||
      h.address?.toLowerCase().includes(searchLower) ||
      h.street_purok?.toLowerCase().includes(searchLower) ||
      h.residents?.some(
        (r) =>
          r.first_name.toLowerCase().includes(searchLower) ||
          r.last_name.toLowerCase().includes(searchLower)
      )
    );
  });

  // Sort toggle handler
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3" /> 
      : <ArrowDown className="h-3 w-3" />;
  };

  // Sort filtered households
  const sortedHouseholds = useMemo(() => {
    return [...filteredHouseholds].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'household_number':
          comparison = (a.household_number || '').localeCompare(b.household_number || '');
          break;
        case 'address':
          const addressA = a.street_purok || a.address || '';
          const addressB = b.street_purok || b.address || '';
          comparison = addressA.localeCompare(addressB);
          break;
        case 'members':
          comparison = (a.residents?.length || 0) - (b.residents?.length || 0);
          break;
        case 'created_at':
          // Use interview_date if available, otherwise compare by household_number
          const dateA = a.interview_date ? new Date(a.interview_date).getTime() : 0;
          const dateB = b.interview_date ? new Date(b.interview_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredHouseholds, sortField, sortOrder]);

  // Handle household selection - load existing census data from approved submissions
  const handleSelectHousehold = async (household: HouseholdData) => {
    setSelectedHousehold(household);
    const head = household.residents?.find((r) => r.is_head_of_household);
    
    // Reset census data to defaults first
    setCensusData((prev) => ({
      ...prev,
      respondentName: head ? `${head.first_name} ${head.middle_name || ""} ${head.last_name}`.trim() : "",
      respondentRelation: head ? "Head" : "",
    }));

    // Try to load existing census data from approved ecological submissions using RPC
    try {
      const { data: submissions, error } = await supabase.rpc(
        "get_ecological_submission_by_household",
        { p_household_number: household.household_number }
      );

      if (!error && submissions && submissions.length > 0) {
        const sub = submissions[0];
        
        // Parse education data
        const educationData = sub.education_data as Record<string, any> || {};
        const healthData = sub.health_data as Record<string, any> || {};
        const disabilityData = sub.disability_data as Record<string, any> || {};
        const deathData = sub.death_data as Record<string, any> || {};
        const familyPlanning = sub.family_planning as Record<string, any> || {};
        const pregnantData = sub.pregnant_data as Record<string, any> || {};
        const seniorData = sub.senior_data as Record<string, any> || {};

        setCensusData((prev) => ({
          ...prev,
          respondentName: sub.respondent_name || prev.respondentName,
          respondentRelation: sub.respondent_relation || prev.respondentRelation,
          interviewDate: sub.interview_date || prev.interviewDate,
          // Education data
          educationData: {
            preschool: { graduate: educationData.preschool || 0, undergraduate: 0 },
            primary: { graduate: educationData.primary || 0, undergraduate: 0 },
            secondary: { graduate: educationData.secondary || 0, undergraduate: 0 },
            vocational: { graduate: educationData.vocational || 0, undergraduate: 0 },
            college: { graduate: educationData.college || 0, undergraduate: 0 },
            postGraduate: { graduate: educationData.postgraduate || 0, undergraduate: 0 },
          },
          // Health data
          healthData: {
            malnutrition_0_11: { first: healthData.malnutrition?.["0-11months"] || 0, second: 0 },
            malnutrition_1_4: { first: healthData.malnutrition?.["1-4years"] || 0, second: 0 },
            malnutrition_5_7: { first: healthData.malnutrition?.["5-7years"] || 0, second: 0 },
          },
          // Disability data
          disabilityData: {
            physical: disabilityData.physical || 0,
            mental: disabilityData.mental || 0,
            visual: disabilityData.visual || 0,
            hearing: disabilityData.hearing || 0,
            speech: disabilityData.speech || 0,
          },
          // Death data
          deathData: {
            infant: deathData.infant || 0,
            maternal: deathData.maternal || 0,
            other: deathData.other || 0,
          },
          // Family planning
          familyPlanning: {
            isAcceptor: familyPlanning.isAcceptor || false,
            type: familyPlanning.type || "",
            otherType: "",
          },
          // Pregnant data
          pregnantData: {
            count: pregnantData.count || healthData.pregnantCount || 0,
            highRiskCount: 0,
          },
          // Senior data
          seniorData: {
            count: seniorData.count || healthData.seniorCount || 0,
            withPension: 0,
          },
          // Counts
          soloParentCount: sub.solo_parent_count || 0,
          pwdCount: sub.pwd_count || 0,
          is4PsBeneficiary: sub.is_4ps_beneficiary || false,
        }));

        toast.success(`Loaded census data from approved submission for ${household.household_number}`);
      } else {
        toast.success(`Selected household: ${household.household_number}`);
      }
    } catch (error) {
      console.error("Error loading census data:", error);
      toast.success(`Selected household: ${household.household_number}`);
    }
  };

  // Save census data to ecological_profile_submissions using RPC
  const handleSaveCensusData = async () => {
    if (!selectedHousehold) {
      toast.error("Please select a household first");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare education data
      const educationData = {
        preschool: censusData.educationData.preschool.graduate,
        primary: censusData.educationData.primary.graduate,
        secondary: censusData.educationData.secondary.graduate,
        vocational: censusData.educationData.vocational.graduate,
        college: censusData.educationData.college.graduate,
        postgraduate: censusData.educationData.postGraduate.graduate,
      };

      // Prepare health data
      const healthData = {
        malnutrition: {
          "0-11months": censusData.healthData.malnutrition_0_11.first,
          "1-4years": censusData.healthData.malnutrition_1_4.first,
          "5-7years": censusData.healthData.malnutrition_5_7.first,
        },
        seniorCount: censusData.seniorData.count,
        pregnantCount: censusData.pregnantData.count,
      };

      // Prepare household members
      const householdMembers = selectedHousehold.residents?.map(r => ({
        full_name: `${r.first_name} ${r.middle_name || ""} ${r.last_name}`.trim(),
        birth_date: r.birth_date,
        gender: r.gender,
        relationship_to_head: r.relation_to_head,
        civil_status: r.civil_status,
        religion: r.religion,
        schooling_status: r.schooling_status,
        education_level: r.education_attainment,
        employment_status: r.employment_status,
        occupation: r.occupation,
        monthly_income: r.monthly_income_cash,
      })) || [];

      // Call the RPC function to save census data (bypasses RLS)
      const { data, error } = await supabase.rpc("staff_save_ecological_census", {
        p_household_id: selectedHousehold.id,
        p_household_number: selectedHousehold.household_number,
        p_respondent_name: censusData.respondentName || null,
        p_respondent_relation: censusData.respondentRelation || null,
        p_interview_date: censusData.interviewDate || null,
        p_address: selectedHousehold.address || null,
        p_house_number: selectedHousehold.house_number || null,
        p_street_purok: selectedHousehold.street_purok || null,
        p_barangay: selectedHousehold.barangay || "Salud Mitra",
        p_city: selectedHousehold.city || "Sample City",
        p_province: selectedHousehold.province || "Sample Province",
        p_district: selectedHousehold.district || null,
        p_years_staying: selectedHousehold.years_staying || null,
        p_place_of_origin: selectedHousehold.place_of_origin || null,
        p_ethnic_group: selectedHousehold.ethnic_group || null,
        p_dwelling_type: selectedHousehold.dwelling_type || null,
        p_house_ownership: selectedHousehold.house_ownership || null,
        p_lot_ownership: selectedHousehold.lot_ownership || null,
        p_water_supply_level: selectedHousehold.water_supply_level || null,
        p_lighting_source: selectedHousehold.lighting_source || null,
        p_is_4ps_beneficiary: censusData.is4PsBeneficiary || false,
        p_toilet_facilities: selectedHousehold.toilet_facilities || null,
        p_drainage_facilities: selectedHousehold.drainage_facilities || null,
        p_garbage_disposal: selectedHousehold.garbage_disposal || null,
        p_water_storage: selectedHousehold.water_storage || null,
        p_food_storage_type: selectedHousehold.food_storage_type || null,
        p_communication_services: selectedHousehold.communication_services || null,
        p_info_sources: selectedHousehold.info_sources || null,
        p_means_of_transport: selectedHousehold.means_of_transport || null,
        p_household_members: householdMembers,
        p_education_data: educationData,
        p_health_data: healthData,
        p_animals: censusData.animals || null,
        p_food_production: censusData.foodProduction || null,
        p_family_planning: {
          isAcceptor: censusData.familyPlanning.isAcceptor,
          type: censusData.familyPlanning.type || censusData.familyPlanning.otherType,
        },
        p_pwd_count: censusData.pwdCount || 0,
        p_solo_parent_count: censusData.soloParentCount || 0,
        p_senior_data: {
          count: censusData.seniorData.count,
          withPension: censusData.seniorData.withPension,
        },
        p_pregnant_data: {
          count: censusData.pregnantData.count,
          highRiskCount: censusData.pregnantData.highRiskCount,
        },
        p_immunization_data: censusData.immunizationData || null,
        p_disability_data: censusData.disabilityData || null,
        p_death_data: censusData.deathData || null,
        p_additional_notes: censusData.additionalNotes || null,
        p_staff_id: "Staff",
      });

      if (error) throw error;

      toast.success(`Census data saved successfully! Submission #${data}`);
      
      // Reload data and re-select the household to refresh the form with saved values
      await loadData();
      
      // Re-fetch and select the household to reload the saved census data
      if (selectedHousehold) {
        // Re-fetch updated household data
        const { data: updatedHouseholds } = await supabase.rpc("get_all_households_for_staff");
        if (updatedHouseholds) {
          const updatedHousehold = updatedHouseholds.find(
            (h: any) => h.id === selectedHousehold.id
          );
          if (updatedHousehold) {
            // Get residents for this household
            const { data: residents } = await supabase.rpc("get_all_residents_for_staff");
            const householdResidents = (residents?.filter(
              (r: any) => r.household_id === updatedHousehold.id
            ) || []).map((r: any) => ({
              ...r,
              dialects_spoken: Array.isArray(r.dialects_spoken) ? r.dialects_spoken : [],
            })) as ResidentData[];
            
            // Cast household data properly
            const typedHousehold: HouseholdData = {
              id: updatedHousehold.id,
              household_number: updatedHousehold.household_number,
              address: updatedHousehold.address,
              barangay: updatedHousehold.barangay,
              city: updatedHousehold.city,
              province: updatedHousehold.province,
              house_number: updatedHousehold.house_number,
              street_purok: updatedHousehold.street_purok,
              district: updatedHousehold.district,
              years_staying: updatedHousehold.years_staying,
              place_of_origin: updatedHousehold.place_of_origin,
              ethnic_group: updatedHousehold.ethnic_group,
              house_ownership: updatedHousehold.house_ownership,
              lot_ownership: updatedHousehold.lot_ownership,
              dwelling_type: updatedHousehold.dwelling_type,
              lighting_source: updatedHousehold.lighting_source,
              water_supply_level: updatedHousehold.water_supply_level,
              water_storage: Array.isArray(updatedHousehold.water_storage) ? (updatedHousehold.water_storage as string[]) : [],
              food_storage_type: Array.isArray(updatedHousehold.food_storage_type) ? (updatedHousehold.food_storage_type as string[]) : [],
              toilet_facilities: Array.isArray(updatedHousehold.toilet_facilities) ? (updatedHousehold.toilet_facilities as string[]) : [],
              drainage_facilities: Array.isArray(updatedHousehold.drainage_facilities) ? (updatedHousehold.drainage_facilities as string[]) : [],
              garbage_disposal: Array.isArray(updatedHousehold.garbage_disposal) ? (updatedHousehold.garbage_disposal as string[]) : [],
              communication_services: Array.isArray(updatedHousehold.communication_services) ? (updatedHousehold.communication_services as string[]) : [],
              means_of_transport: Array.isArray(updatedHousehold.means_of_transport) ? (updatedHousehold.means_of_transport as string[]) : [],
              info_sources: Array.isArray(updatedHousehold.info_sources) ? (updatedHousehold.info_sources as string[]) : [],
              interview_date: updatedHousehold.interview_date,
              residents: householdResidents,
            };
            
            // Reload the household with residents
            await handleSelectHousehold(typedHousehold);
          }
        }
      }
    } catch (error) {
      console.error("Error saving census data:", error);
      toast.error("Failed to save census data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  const validateData = useCallback(() => {
    const warnings: ValidationWarning[] = [];

    if (!selectedHousehold) {
      warnings.push({
        field: "household",
        message: "No household selected for census",
        severity: "error",
      });
      return warnings;
    }

    if (!selectedHousehold.house_ownership) {
      warnings.push({
        field: "house_ownership",
        message: "House ownership status not specified",
        severity: "warning",
        householdId: selectedHousehold.id,
      });
    }

    if (!selectedHousehold.residents || selectedHousehold.residents.length === 0) {
      warnings.push({
        field: "residents",
        message: "No residents registered in this household",
        severity: "error",
        householdId: selectedHousehold.id,
      });
    }

    if (!censusData.respondentName) {
      warnings.push({
        field: "respondent_name",
        message: "Respondent name not filled",
        severity: "error",
      });
    }

    setValidationWarnings(warnings);
    return warnings;
  }, [selectedHousehold, censusData]);

  // Checkbox helper for arrays
  const handleCheckboxArray = (
    currentArray: string[] | null,
    value: string,
    checked: boolean
  ): string[] => {
    const arr = currentArray || [];
    if (checked) {
      return [...arr, value];
    }
    return arr.filter((v) => v !== value);
  };

  // Styles for the report
  const getReportStyles = (): string => {
    return `
    .report-container {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: white;
    }
    .report-container .page {
      padding: 10px;
      margin-bottom: 20px;
      border-bottom: 1px dashed #ccc;
    }
    .report-container .page:last-child {
      border-bottom: none;
    }
    .report-container .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .report-container .header h1 {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .report-container .section {
      margin-bottom: 15px;
    }
    .report-container .section-title {
      font-weight: bold;
      font-size: 12px;
      background: #f0f0f0;
      padding: 5px;
      margin-bottom: 8px;
      border-left: 3px solid #333;
    }
    .report-container .field-row {
      display: flex;
      margin-bottom: 5px;
      align-items: flex-start;
    }
    .report-container .field-label {
      font-weight: bold;
      min-width: 150px;
    }
    .report-container .field-value {
      border-bottom: 1px solid #333;
      flex: 1;
      min-height: 18px;
      padding-left: 5px;
    }
    .report-container .checkbox-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .report-container .checkbox-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .report-container .checkbox {
      width: 12px;
      height: 12px;
      border: 1px solid #333;
      display: inline-block;
    }
    .report-container .checkbox.checked {
      background: #333;
    }
    .report-container table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10px;
    }
    .report-container th, .report-container td {
      border: 1px solid #333;
      padding: 4px;
      text-align: left;
    }
    .report-container th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .report-container .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .report-container .household-number {
      position: absolute;
      top: 10px;
      right: 10px;
      font-weight: bold;
      border: 1px solid #333;
      padding: 5px 10px;
    }
    .report-container .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    `;
  };

  // Generate body content
  const generateBodyContent = (): string => {
    if (!selectedHousehold) return "";

    const household = selectedHousehold;
    const residents = household.residents || [];
    const headOfHousehold = residents.find((r) => r.is_head_of_household) || residents[0];

    return `
  <div class="report-container">
  <!-- Page 1: Basic Information -->
  <div class="page">
    <div class="header">
      <div style="font-weight: bold; margin-bottom: 5px;">BARANGAY ${(household.barangay || "").toUpperCase()}</div>
      <h1>BARANGAY ECOLOGICAL PROFILE CENSUS</h1>
    </div>
    <div class="household-number">Household/Family Number: ${household.household_number}</div>
    
    <div class="field-row" style="margin-bottom: 15px;">
      <span class="field-label">Date of Interview:</span>
      <span class="field-value">${censusData.interviewDate ? format(new Date(censusData.interviewDate), "MMMM dd, yyyy") : ""}</span>
    </div>

    <div class="section">
      <div class="section-title">1. Name of Respondent</div>
      <div class="two-column">
        <div class="field-row">
          <span class="field-label">Surname:</span>
          <span class="field-value">${headOfHousehold?.last_name || censusData.respondentName.split(" ").pop() || ""}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Given:</span>
          <span class="field-value">${headOfHousehold?.first_name || censusData.respondentName.split(" ")[0] || ""}</span>
        </div>
      </div>
      <div class="field-row">
        <span class="field-label">Middle Name:</span>
        <span class="field-value">${headOfHousehold?.middle_name || ""}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Relation to Head:</span>
        <span class="field-value">${censusData.respondentRelation || ""}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">2. Address</div>
      <div class="two-column">
        <div class="field-row">
          <span class="field-label">House Number:</span>
          <span class="field-value">${household.house_number || ""}</span>
        </div>
        <div class="field-row">
          <span class="field-label">Street/Purok:</span>
          <span class="field-value">${household.street_purok || ""}</span>
        </div>
      </div>
      <div class="two-column">
        <div class="field-row">
          <span class="field-label">District/Barangay:</span>
          <span class="field-value">${household.district || household.barangay || ""}</span>
        </div>
        <div class="field-row">
          <span class="field-label">No. of years staying:</span>
          <span class="field-value">${household.years_staying || ""}</span>
        </div>
      </div>
      <div class="field-row">
        <span class="field-label">Place of origin and ethnic group:</span>
        <span class="field-value">${household.place_of_origin || ""} ${household.ethnic_group ? `(${household.ethnic_group})` : ""}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">3. Dialects</div>
      <div class="checkbox-group">
        ${DIALECTS.map((d) => `
          <span class="checkbox-item">
            <span class="checkbox ${residents.some((r) => r.dialects_spoken?.includes(d)) ? "checked" : ""}"></span>
            ${d}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">4. Housing</div>
      <div class="two-column">
        <div>
          <strong>a1. House:</strong>
          <div class="checkbox-group" style="margin-top: 5px;">
            ${HOUSE_OWNERSHIP.map((o) => `
              <span class="checkbox-item">
                <span class="checkbox ${household.house_ownership === o ? "checked" : ""}"></span>
                ${o}
              </span>
            `).join("")}
          </div>
        </div>
        <div>
          <strong>a2. Lot:</strong>
          <div class="checkbox-group" style="margin-top: 5px;">
            ${LOT_OWNERSHIP.map((o) => `
              <span class="checkbox-item">
                <span class="checkbox ${household.lot_ownership === o ? "checked" : ""}"></span>
                ${o}
              </span>
            `).join("")}
          </div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <strong>b. Type of dwelling structure:</strong>
        <div class="checkbox-group" style="margin-top: 5px;">
          ${DWELLING_TYPES.map((t) => `
            <span class="checkbox-item">
              <span class="checkbox ${household.dwelling_type === t ? "checked" : ""}"></span>
              ${t}
            </span>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="footer">Page 1 of 4</div>
  </div>

  <!-- Page 2: Services & Education -->
  <div class="page">
    <div class="header">
      <h2>SERVICES & EDUCATION - ${household.household_number}</h2>
    </div>

    <div class="section">
      <div class="section-title">5. Energy Source - Lighting</div>
      <div class="checkbox-group">
        ${LIGHTING_SOURCES.map((s) => `
          <span class="checkbox-item">
            <span class="checkbox ${household.lighting_source === s ? "checked" : ""}"></span>
            ${s}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">6. Source of Information</div>
      <div class="checkbox-group">
        ${INFO_SOURCES.map((s) => `
          <span class="checkbox-item">
            <span class="checkbox ${household.info_sources?.includes(s) ? "checked" : ""}"></span>
            ${s}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">7. Communication Services</div>
      <div class="checkbox-group">
        ${COMMUNICATION_SERVICES.map((s) => `
          <span class="checkbox-item">
            <span class="checkbox ${household.communication_services?.includes(s) ? "checked" : ""}"></span>
            ${s}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">8. Means of Transportation</div>
      <div class="checkbox-group">
        ${MEANS_OF_TRANSPORT.map((t) => `
          <span class="checkbox-item">
            <span class="checkbox ${household.means_of_transport?.includes(t) ? "checked" : ""}"></span>
            ${t}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">9. Educational Background (in numbers)</div>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Graduate</th>
            <th>Undergraduate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pre-school/Day care</td>
            <td>${censusData.educationData.preschool.graduate}</td>
            <td>${censusData.educationData.preschool.undergraduate}</td>
          </tr>
          <tr>
            <td>Primary/Elementary</td>
            <td>${censusData.educationData.primary.graduate}</td>
            <td>${censusData.educationData.primary.undergraduate}</td>
          </tr>
          <tr>
            <td>Secondary/High School</td>
            <td>${censusData.educationData.secondary.graduate}</td>
            <td>${censusData.educationData.secondary.undergraduate}</td>
          </tr>
          <tr>
            <td>Vocational/Technical</td>
            <td>${censusData.educationData.vocational.graduate}</td>
            <td>${censusData.educationData.vocational.undergraduate}</td>
          </tr>
          <tr>
            <td>College/University</td>
            <td>${censusData.educationData.college.graduate}</td>
            <td>${censusData.educationData.college.undergraduate}</td>
          </tr>
          <tr>
            <td>Post Graduate</td>
            <td>${censusData.educationData.postGraduate.graduate}</td>
            <td>${censusData.educationData.postGraduate.undergraduate}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">10. Family Planning</div>
      <div class="field-row">
        <span class="field-label">Acceptor:</span>
        <span class="field-value">${censusData.familyPlanning.isAcceptor ? "Yes" : "No"}</span>
      </div>
      ${censusData.familyPlanning.isAcceptor ? `
      <div class="field-row">
        <span class="field-label">Type:</span>
        <span class="field-value">${censusData.familyPlanning.type || ""}</span>
      </div>
      ` : ""}
    </div>

    <div class="footer">Page 2 of 4</div>
  </div>

  <!-- Page 3: Household Members -->
  <div class="page">
    <div class="header">
      <h2>HOUSEHOLD SIZE - ${household.household_number}</h2>
    </div>

    <table style="font-size: 9px;">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Relation</th>
          <th>Birth Date</th>
          <th>Sex</th>
          <th>Civil Status</th>
          <th>Religion</th>
          <th>Schooling</th>
          <th>Education</th>
          <th>Employment</th>
          <th>Income (Cash)</th>
        </tr>
      </thead>
      <tbody>
        ${residents.map((r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.last_name}, ${r.first_name} ${r.middle_name || ""} ${r.suffix || ""}</td>
            <td>${r.relation_to_head || (r.is_head_of_household ? "Head" : "")}</td>
            <td>${r.birth_date ? format(new Date(r.birth_date), "MM/dd/yyyy") : ""}</td>
            <td>${r.gender?.charAt(0).toUpperCase() || ""}</td>
            <td>${r.civil_status || ""}</td>
            <td>${r.religion || ""}</td>
            <td>${r.schooling_status || ""}</td>
            <td>${r.education_attainment || ""}</td>
            <td>${r.employment_status || ""}</td>
            <td>${r.monthly_income_cash || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="section" style="margin-top: 20px;">
      <div class="section-title">Special Categories</div>
      <div class="two-column">
        <div>
          <div class="field-row">
            <span class="field-label">Senior Citizens:</span>
            <span class="field-value">${censusData.seniorData.count}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Solo Parents:</span>
            <span class="field-value">${censusData.soloParentCount}</span>
          </div>
          <div class="field-row">
            <span class="field-label">PWD:</span>
            <span class="field-value">${censusData.pwdCount}</span>
          </div>
        </div>
        <div>
          <div class="field-row">
            <span class="field-label">4Ps Beneficiary:</span>
            <span class="field-value">${censusData.is4PsBeneficiary ? "Yes" : "No"}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Pregnant Women:</span>
            <span class="field-value">${censusData.pregnantData.count}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">Page 3 of 4</div>
  </div>

  <!-- Page 4: Environmental & Health -->
  <div class="page">
    <div class="header">
      <h2>ENVIRONMENTAL SANITATION & HEALTH - ${household.household_number}</h2>
    </div>

    <div class="two-column">
      <div class="section">
        <div class="section-title">Water Supply Source</div>
        <div class="checkbox-group">
          ${WATER_SOURCES.map((s) => `
            <span class="checkbox-item">
              <span class="checkbox ${household.water_supply_level === s ? "checked" : ""}"></span>
              ${s}
            </span>
          `).join("")}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Water Storage</div>
        <div class="checkbox-group">
          ${WATER_STORAGE.map((s) => `
            <span class="checkbox-item">
              <span class="checkbox ${household.water_storage?.includes(s) ? "checked" : ""}"></span>
              ${s}
            </span>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="two-column">
      <div class="section">
        <div class="section-title">Kind of Food Storage</div>
        <div class="checkbox-group">
          ${FOOD_STORAGE.map((s) => `
            <span class="checkbox-item">
              <span class="checkbox ${household.food_storage_type?.includes(s) ? "checked" : ""}"></span>
              ${s}
            </span>
          `).join("")}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Toilet Facilities</div>
        <div class="checkbox-group">
          ${TOILET_FACILITIES.map((t) => `
            <span class="checkbox-item">
              <span class="checkbox ${household.toilet_facilities?.includes(t) ? "checked" : ""}"></span>
              ${t}
            </span>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Garbage Disposal</div>
      <div class="checkbox-group">
        ${GARBAGE_DISPOSAL.map((g) => `
          <span class="checkbox-item">
            <span class="checkbox ${household.garbage_disposal?.includes(g) ? "checked" : ""}"></span>
            ${g}
          </span>
        `).join("")}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Children Malnutrition Data</div>
      <table>
        <thead>
          <tr>
            <th>Age Group</th>
            <th>1st Degree</th>
            <th>2nd Degree</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0-11 months old</td>
            <td>${censusData.healthData.malnutrition_0_11.first}</td>
            <td>${censusData.healthData.malnutrition_0_11.second}</td>
          </tr>
          <tr>
            <td>1-4 years</td>
            <td>${censusData.healthData.malnutrition_1_4.first}</td>
            <td>${censusData.healthData.malnutrition_1_4.second}</td>
          </tr>
          <tr>
            <td>5 under 7 years</td>
            <td>${censusData.healthData.malnutrition_5_7.first}</td>
            <td>${censusData.healthData.malnutrition_5_7.second}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Immunized Children (0-6 years old)</div>
      <table>
        <thead>
          <tr>
            <th>Birth Status</th>
            <th>Registered</th>
            <th>Not Registered</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Born Alive</td>
            <td>${censusData.immunizationData.bornAlive.registered}</td>
            <td>${censusData.immunizationData.bornAlive.notRegistered}</td>
          </tr>
          <tr>
            <td>Born Dead</td>
            <td>${censusData.immunizationData.bornDead.registered}</td>
            <td>${censusData.immunizationData.bornDead.notRegistered}</td>
          </tr>
          <tr>
            <td>Still Birth</td>
            <td>${censusData.immunizationData.stillBirth.registered}</td>
            <td>${censusData.immunizationData.stillBirth.notRegistered}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Additional Notes</div>
      <p>${censusData.additionalNotes || "None"}</p>
    </div>

    <div class="footer">
      <p>Generated on ${format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</p>
      <p>Page 4 of 4</p>
    </div>
  </div>
  </div>
    `;
  };

  // Generate preview content (without full HTML structure)
  const generatePreviewContent = (): string => {
    return `<style>${getReportStyles()}</style>${generateBodyContent()}`;
  };

  // Generate full HTML report
  const generateReportHTML = (): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Barangay Ecological Profile Census - ${selectedHousehold?.household_number || ""}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: white;
    }
    ${getReportStyles()}
    .report-container .page {
      page-break-after: always;
    }
    .report-container .page:last-child {
      page-break-after: auto;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${generateBodyContent()}
</body>
</html>
    `;
  };

  // Generate report
  const generateReport = async (type: "pdf" | "print") => {
    if (!selectedHousehold) {
      toast.error("Please select a household first");
      return;
    }

    const warnings = validateData();
    const errors = warnings.filter((w) => w.severity === "error");
    if (errors.length > 0) {
      toast.error("Please fix all errors before generating the report");
      return;
    }

    setIsGenerating(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups for this site");
        return;
      }

      const reportHTML = generateReportHTML();
      printWindow.document.write(reportHTML);
      printWindow.document.close();

      if (type === "print") {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast.success(`Report ${type === "pdf" ? "generated" : "sent to print"}`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const populationStats = getPopulationStats();

  // Render Basic Info Tab
  const renderBasicInfoTab = () => (
    <div className="space-y-6">
      {/* Household Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Select Household
          </CardTitle>
          <CardDescription>Choose a household to generate the ecological profile census</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by household number, address, or resident name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select 
              value={`${sortField}-${sortOrder}`} 
              onValueChange={(val) => {
                const [field, order] = val.split('-') as [typeof sortField, 'asc' | 'desc'];
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="household_number-asc">Household # (A-Z)</SelectItem>
                <SelectItem value="household_number-desc">Household # (Z-A)</SelectItem>
                <SelectItem value="address-asc">Address (A-Z)</SelectItem>
                <SelectItem value="members-desc">Most Members</SelectItem>
                <SelectItem value="members-asc">Fewest Members</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[250px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('household_number')}
                  >
                    <div className="flex items-center gap-1">
                      Household #
                      {getSortIcon('household_number')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('address')}
                  >
                    <div className="flex items-center gap-1">
                      Address
                      {getSortIcon('address')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('members')}
                  >
                    <div className="flex items-center gap-1">
                      Members
                      {getSortIcon('members')}
                    </div>
                  </TableHead>
                  <TableHead>Head of Household</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Date Added
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHouseholds.map((h) => {
                  const head = h.residents?.find((r) => r.is_head_of_household);
                  return (
                    <TableRow 
                      key={h.id}
                      className={selectedHousehold?.id === h.id ? "bg-primary/10" : ""}
                    >
                      <TableCell className="font-medium">{h.household_number}</TableCell>
                      <TableCell>{h.street_purok || h.address || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{h.residents?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {head ? `${head.first_name} ${head.last_name}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {h.interview_date ? format(new Date(h.interview_date), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={selectedHousehold?.id === h.id ? "default" : "outline"}
                          onClick={() => handleSelectHousehold(h)}
                        >
                          {selectedHousehold?.id === h.id ? <CheckCircle2 className="h-4 w-4 mr-1" /> : null}
                          {selectedHousehold?.id === h.id ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Interview Details */}
      {selectedHousehold && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date of Interview</Label>
                <Input
                  type="date"
                  value={censusData.interviewDate}
                  onChange={(e) => setCensusData((prev) => ({ ...prev, interviewDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Respondent Name</Label>
                <Input
                  value={censusData.respondentName}
                  onChange={(e) => setCensusData((prev) => ({ ...prev, respondentName: e.target.value }))}
                  placeholder="Enter respondent name"
                />
              </div>
              <div className="space-y-2">
                <Label>Relation to Head</Label>
                <Select
                  value={censusData.respondentRelation}
                  onValueChange={(value) => setCensusData((prev) => ({ ...prev, respondentRelation: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATION_TO_HEAD.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <Label className="text-muted-foreground text-xs">House Number</Label>
                <p className="font-medium">{selectedHousehold.house_number || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Street/Purok</Label>
                <p className="font-medium">{selectedHousehold.street_purok || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Barangay</Label>
                <p className="font-medium">{selectedHousehold.barangay || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Years Staying</Label>
                <p className="font-medium">{selectedHousehold.years_staying || "-"}</p>
              </div>
            </div>

            {/* Origin Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Place of Origin</Label>
                <p className="font-medium">{selectedHousehold.place_of_origin || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Ethnic Group</Label>
                <p className="font-medium">{selectedHousehold.ethnic_group || "-"}</p>
              </div>
            </div>

            {/* Dialects */}
            <div>
              <Label className="text-muted-foreground text-xs">Dialects Spoken (by household members)</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {(() => {
                  const allDialects = new Set<string>();
                  selectedHousehold.residents?.forEach((r) => {
                    r.dialects_spoken?.forEach((d) => allDialects.add(d));
                  });
                  return allDialects.size > 0 ? (
                    Array.from(allDialects).map((d) => (
                      <Badge key={d} variant="secondary">{d}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render Housing Tab
  const renderHousingTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Housing Information
            </CardTitle>
            <CardDescription>Housing ownership and structure details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-semibold">House Ownership</Label>
                <div className="flex flex-wrap gap-3">
                  {HOUSE_OWNERSHIP.map((o) => (
                    <div key={o} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedHousehold.house_ownership === o}
                        disabled
                      />
                      <span className="text-sm">{o}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: <strong>{selectedHousehold.house_ownership || "Not specified"}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Lot Ownership</Label>
                <div className="flex flex-wrap gap-3">
                  {LOT_OWNERSHIP.map((o) => (
                    <div key={o} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedHousehold.lot_ownership === o}
                        disabled
                      />
                      <span className="text-sm">{o}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: <strong>{selectedHousehold.lot_ownership || "Not specified"}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Type of Dwelling Structure</Label>
              <div className="flex flex-wrap gap-3">
                {DWELLING_TYPES.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedHousehold.dwelling_type === t}
                      disabled
                    />
                    <span className="text-sm">{t}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Current: <strong>{selectedHousehold.dwelling_type || "Not specified"}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Services Tab
  const renderServicesTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Energy & Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="font-semibold">Energy Source - Lighting</Label>
              <div className="flex flex-wrap gap-3">
                {LIGHTING_SOURCES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.lighting_source === s} disabled />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Current: <strong>{selectedHousehold.lighting_source || "Not specified"}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Source of Information</Label>
              <div className="flex flex-wrap gap-3">
                {INFO_SOURCES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.info_sources?.includes(s)} disabled />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedHousehold.info_sources?.length ? (
                  selectedHousehold.info_sources.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Communication Services</Label>
              <div className="flex flex-wrap gap-3">
                {COMMUNICATION_SERVICES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.communication_services?.includes(s)} disabled />
                    <span className="text-sm">{s}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedHousehold.communication_services?.length ? (
                  selectedHousehold.communication_services.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Means of Transportation</Label>
              <div className="flex flex-wrap gap-3">
                {MEANS_OF_TRANSPORT.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.means_of_transport?.includes(t)} disabled />
                    <span className="text-sm">{t}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedHousehold.means_of_transport?.length ? (
                  selectedHousehold.means_of_transport.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Education & Health Tab
  const renderEducationHealthTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Educational Background (by number in household)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Education Level</TableHead>
                  <TableHead className="w-32">Graduate</TableHead>
                  <TableHead className="w-32">Undergraduate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries({
                  preschool: "Pre-school/Day care",
                  primary: "Primary/Elementary",
                  secondary: "Secondary/High School",
                  vocational: "Vocational/Technical",
                  college: "College/University",
                  postGraduate: "Post Graduate",
                }).map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={censusData.educationData[key as keyof typeof censusData.educationData].graduate}
                        onChange={(e) => setCensusData((prev) => ({
                          ...prev,
                          educationData: {
                            ...prev.educationData,
                            [key]: { ...prev.educationData[key as keyof typeof prev.educationData], graduate: parseInt(e.target.value) || 0 },
                          },
                        }))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={censusData.educationData[key as keyof typeof censusData.educationData].undergraduate}
                        onChange={(e) => setCensusData((prev) => ({
                          ...prev,
                          educationData: {
                            ...prev.educationData,
                            [key]: { ...prev.educationData[key as keyof typeof prev.educationData], undergraduate: parseInt(e.target.value) || 0 },
                          },
                        }))}
                        className="w-20"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Family Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={censusData.familyPlanning.isAcceptor}
                  onCheckedChange={(checked) => setCensusData((prev) => ({
                    ...prev,
                    familyPlanning: { ...prev.familyPlanning, isAcceptor: checked as boolean },
                  }))}
                />
                <Label>Family Planning Acceptor</Label>
              </div>
            </div>
            {censusData.familyPlanning.isAcceptor && (
              <div className="space-y-2">
                <Label>Type of Family Planning Method</Label>
                <Select
                  value={censusData.familyPlanning.type}
                  onValueChange={(value) => setCensusData((prev) => ({
                    ...prev,
                    familyPlanning: { ...prev.familyPlanning, type: value },
                  }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_PLANNING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Senior Citizens (60+)</Label>
                <Input
                  type="number"
                  min="0"
                  value={censusData.seniorData.count}
                  onChange={(e) => setCensusData((prev) => ({
                    ...prev,
                    seniorData: { ...prev.seniorData, count: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Solo Parents</Label>
                <Input
                  type="number"
                  min="0"
                  value={censusData.soloParentCount}
                  onChange={(e) => setCensusData((prev) => ({
                    ...prev,
                    soloParentCount: parseInt(e.target.value) || 0,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>PWD</Label>
                <Input
                  type="number"
                  min="0"
                  value={censusData.pwdCount}
                  onChange={(e) => setCensusData((prev) => ({
                    ...prev,
                    pwdCount: parseInt(e.target.value) || 0,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pregnant Women</Label>
                <Input
                  type="number"
                  min="0"
                  value={censusData.pregnantData.count}
                  onChange={(e) => setCensusData((prev) => ({
                    ...prev,
                    pregnantData: { ...prev.pregnantData, count: parseInt(e.target.value) || 0 },
                  }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={censusData.is4PsBeneficiary}
                onCheckedChange={(checked) => setCensusData((prev) => ({
                  ...prev,
                  is4PsBeneficiary: checked as boolean,
                }))}
              />
              <Label>4Ps Beneficiary</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Household Members Tab
  const renderHouseholdMembersTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    const residents = selectedHousehold.residents || [];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Household Members ({residents.length})
            </CardTitle>
            <CardDescription>
              Complete list of all members in household {selectedHousehold.household_number}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
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
                    <TableHead>Income (Cash)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residents.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        {r.last_name}, {r.first_name} {r.middle_name || ""} {r.suffix || ""}
                        {r.is_head_of_household && (
                          <Badge variant="outline" className="ml-2">Head</Badge>
                        )}
                      </TableCell>
                      <TableCell>{r.relation_to_head || (r.is_head_of_household ? "Head" : "-")}</TableCell>
                      <TableCell>{r.birth_date ? format(new Date(r.birth_date), "MM/dd/yyyy") : "-"}</TableCell>
                      <TableCell>{calculateAge(r.birth_date)}</TableCell>
                      <TableCell>{r.gender?.charAt(0).toUpperCase() || "-"}</TableCell>
                      <TableCell>{r.civil_status || "-"}</TableCell>
                      <TableCell>{r.religion || "-"}</TableCell>
                      <TableCell>{r.schooling_status || "-"}</TableCell>
                      <TableCell>{r.education_attainment || "-"}</TableCell>
                      <TableCell>{r.employment_status || "-"}</TableCell>
                      <TableCell>{r.monthly_income_cash || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equivalents Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Sex:</strong> M - Male, F - Female</p>
                <p><strong>Civil Status:</strong> S - Single, M - Married, W - Widowed, Sep - Separated</p>
                <p><strong>Schooling:</strong> IS - In school, OS - Out of school, NYS - Not yet in school, G - Graduate</p>
              </div>
              <div>
                <p><strong>Employment Status:</strong> P - Permanent, C - Contractual, T - Temporary, SE - Self-employed</p>
                <p><strong>Employment Category:</strong> Priv - Private, Gov - Government, SE - Self Employed</p>
                <p><strong>Income Ranges:</strong> 3k & below, 3001-4999, 5000-6999, 7000-8999, etc.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Environmental Tab
  const renderEnvironmentalTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Water & Sanitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-semibold">Water Supply Source</Label>
                <div className="flex flex-wrap gap-3">
                  {WATER_SOURCES.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <Checkbox checked={selectedHousehold.water_supply_level === s} disabled />
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Current: <strong>{selectedHousehold.water_supply_level || "Not specified"}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Water Storage</Label>
                <div className="flex flex-wrap gap-3">
                  {WATER_STORAGE.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <Checkbox checked={selectedHousehold.water_storage?.includes(s)} disabled />
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedHousehold.water_storage?.length ? (
                    selectedHousehold.water_storage.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Not specified</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="font-semibold">Kind of Food Storage</Label>
                <div className="flex flex-wrap gap-3">
                  {FOOD_STORAGE.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <Checkbox checked={selectedHousehold.food_storage_type?.includes(s)} disabled />
                      <span className="text-sm">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedHousehold.food_storage_type?.length ? (
                    selectedHousehold.food_storage_type.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Not specified</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Toilet Facilities</Label>
                <div className="flex flex-wrap gap-3">
                  {TOILET_FACILITIES.map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <Checkbox checked={selectedHousehold.toilet_facilities?.includes(t)} disabled />
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedHousehold.toilet_facilities?.length ? (
                    selectedHousehold.toilet_facilities.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Not specified</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Garbage Disposal</Label>
              <div className="flex flex-wrap gap-3">
                {GARBAGE_DISPOSAL.map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.garbage_disposal?.includes(g)} disabled />
                    <span className="text-sm">{g}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedHousehold.garbage_disposal?.length ? (
                  selectedHousehold.garbage_disposal.map((g) => (
                    <Badge key={g} variant="secondary">{g}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Drainage Facilities</Label>
              <div className="flex flex-wrap gap-3">
                {DRAINAGE_FACILITIES.map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <Checkbox checked={selectedHousehold.drainage_facilities?.includes(d)} disabled />
                    <span className="text-sm">{d}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedHousehold.drainage_facilities?.length ? (
                  selectedHousehold.drainage_facilities.map((d) => (
                    <Badge key={d} variant="secondary">{d}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Food Production & Animals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="font-semibold">Food Production Activities</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: "vegetables", label: "Vegetables/Crops" },
                  { key: "livestock", label: "Livestock" },
                  { key: "poultry", label: "Poultry" },
                  { key: "fishery", label: "Fishery" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={censusData.foodProduction[key as keyof typeof censusData.foodProduction] as boolean}
                      onCheckedChange={(checked) => setCensusData((prev) => ({
                        ...prev,
                        foodProduction: { ...prev.foodProduction, [key]: checked as boolean },
                      }))}
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Number of Animals/Pets</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { key: "dogs", label: "Dogs" },
                  { key: "cats", label: "Cats" },
                  { key: "chickens", label: "Chickens" },
                  { key: "pigs", label: "Pigs" },
                  { key: "goats", label: "Goats" },
                  { key: "cows", label: "Cows" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm">{label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.animals[key as keyof typeof censusData.animals] as number}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        animals: { ...prev.animals, [key]: parseInt(e.target.value) || 0 },
                      }))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render Health Info Tab
  const renderHealthInfoTab = () => {
    if (!selectedHousehold) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Household Selected</AlertTitle>
          <AlertDescription>Please select a household in the Basic Info tab first.</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Children Malnutrition Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age Group</TableHead>
                  <TableHead className="w-32">1st Degree</TableHead>
                  <TableHead className="w-32">2nd Degree</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>0-11 months old</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_0_11.first}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_0_11: { ...prev.healthData.malnutrition_0_11, first: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_0_11.second}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_0_11: { ...prev.healthData.malnutrition_0_11, second: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>1-4 years</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_1_4.first}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_1_4: { ...prev.healthData.malnutrition_1_4, first: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_1_4.second}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_1_4: { ...prev.healthData.malnutrition_1_4, second: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>5 under 7 years</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_5_7.first}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_5_7: { ...prev.healthData.malnutrition_5_7, first: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.healthData.malnutrition_5_7.second}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        healthData: {
                          ...prev.healthData,
                          malnutrition_5_7: { ...prev.healthData.malnutrition_5_7, second: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Immunized Children (0-6 years old)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Birth Status</TableHead>
                  <TableHead className="w-32">Registered</TableHead>
                  <TableHead className="w-32">Not Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Born Alive</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.bornAlive.registered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          bornAlive: { ...prev.immunizationData.bornAlive, registered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.bornAlive.notRegistered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          bornAlive: { ...prev.immunizationData.bornAlive, notRegistered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Born Dead</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.bornDead.registered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          bornDead: { ...prev.immunizationData.bornDead, registered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.bornDead.notRegistered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          bornDead: { ...prev.immunizationData.bornDead, notRegistered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Still Birth</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.stillBirth.registered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          stillBirth: { ...prev.immunizationData.stillBirth, registered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={censusData.immunizationData.stillBirth.notRegistered}
                      onChange={(e) => setCensusData((prev) => ({
                        ...prev,
                        immunizationData: {
                          ...prev.immunizationData,
                          stillBirth: { ...prev.immunizationData.stillBirth, notRegistered: parseInt(e.target.value) || 0 },
                        },
                      }))}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disability Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: "physical", label: "Physical" },
                { key: "mental", label: "Mental" },
                { key: "visual", label: "Visual" },
                { key: "hearing", label: "Hearing" },
                { key: "speech", label: "Speech" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={censusData.disabilityData[key as keyof typeof censusData.disabilityData]}
                    onChange={(e) => setCensusData((prev) => ({
                      ...prev,
                      disabilityData: { ...prev.disabilityData, [key]: parseInt(e.target.value) || 0 },
                    }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={censusData.additionalNotes}
              onChange={(e) => setCensusData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
              placeholder="Enter any additional notes or observations..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Generate Report Section */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
            <CardDescription>Generate a print-ready Barangay Ecological Profile Census report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleSaveCensusData}
                variant="default"
                disabled={isSaving || !selectedHousehold}
                className="bg-accent hover:bg-accent/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Census Data
              </Button>
              <Button
                onClick={() => setShowPreview(true)}
                variant="outline"
                disabled={!selectedHousehold}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Report
              </Button>
              <Button
                onClick={() => generateReport("print")}
                disabled={isGenerating || !selectedHousehold}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Print Report
              </Button>
              <Button
                onClick={() => generateReport("pdf")}
                variant="secondary"
                disabled={isGenerating || !selectedHousehold}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading census data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Barangay Ecological Profile Census</h2>
          <p className="text-muted-foreground">
            Generate official ecological profile reports following the standard template
          </p>
        </div>
        <Button variant="outline" onClick={() => { loadData(); refreshGlobalStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Stats - Using synchronized context values */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHouseholds || households.length}</div>
            <p className="text-xs text-muted-foreground">Total Households</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalResidents}</div>
            <p className="text-xs text-muted-foreground">Total Population</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{maleCount}</div>
            <p className="text-xs text-muted-foreground">Male</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-pink-600">{femaleCount}</div>
            <p className="text-xs text-muted-foreground">Female</p>
          </CardContent>
        </Card>
      </div>

      {/* Selected Household Banner */}
      {selectedHousehold && (
        <Alert className="border-primary bg-primary/5">
          <Home className="h-4 w-4" />
          <AlertTitle>Selected: Household {selectedHousehold.household_number}</AlertTitle>
          <AlertDescription>
            {selectedHousehold.street_purok || selectedHousehold.address || "No address"} • 
            {selectedHousehold.residents?.length || 0} members
          </AlertDescription>
        </Alert>
      )}

      {/* Tabbed Form */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-7 w-full">
          {CENSUS_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="text-xs md:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="basic-info" className="mt-6">
          {renderBasicInfoTab()}
        </TabsContent>

        <TabsContent value="housing" className="mt-6">
          {renderHousingTab()}
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          {renderServicesTab()}
        </TabsContent>

        <TabsContent value="education-health" className="mt-6">
          {renderEducationHealthTab()}
        </TabsContent>

        <TabsContent value="household-members" className="mt-6">
          {renderHouseholdMembersTab()}
        </TabsContent>

        <TabsContent value="environmental" className="mt-6">
          {renderEnvironmentalTab()}
        </TabsContent>

        <TabsContent value="health-info" className="mt-6">
          {renderHealthInfoTab()}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Preview of the Barangay Ecological Profile Census report
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg p-4 bg-white text-black overflow-auto"
            dangerouslySetInnerHTML={{ __html: generatePreviewContent() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={() => generateReport("print")}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EcologicalProfileTab;

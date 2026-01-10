import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  ChevronRight, 
  ChevronLeft,
  Loader2,
  RefreshCw,
  Eye,
  ClipboardCheck,
  FileWarning,
  Trash2,
  Save,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface CensusProfile {
  id?: string;
  household_id: string;
  interview_date: string;
  respondent_name: string;
  data_collection_complete: boolean;
  environmental_complete: boolean;
  health_complete: boolean;
  finalized: boolean;
  created_at?: string;
  updated_at?: string;
}

const STEPS = [
  { id: 1, name: "Data Collection", icon: Users, description: "Household & Resident Information" },
  { id: 2, name: "Environmental Data", icon: Droplets, description: "Sanitation & Resources" },
  { id: 3, name: "Incidents & Risks", icon: AlertTriangle, description: "Community Issues" },
  { id: 4, name: "Review & Finalize", icon: ClipboardCheck, description: "Validate & Generate Report" },
];

const DIALECTS = ["Filipino", "Ilongo", "Tagalog", "Waray", "Bicolano", "Cebuano", "Ilocano"];
const HOUSE_OWNERSHIP = ["Owned", "Rented", "Caretaker", "Others"];
const LOT_OWNERSHIP = ["Owned", "Rented", "Caretaker", "Others"];
const DWELLING_TYPES = ["Permanent concrete", "Semi Permanent", "Temporary", "Others"];
const LIGHTING_SOURCES = ["Electricity", "Kerosene", "Solar", "Others"];
const WATER_SOURCES = ["Spring", "Deepwell (private)", "Deepwell (public)", "Piped water"];
const WATER_STORAGE = ["Tank", "Elevated Tank", "Jars", "Drums/Cans", "Plastic Containers", "Others"];
const FOOD_STORAGE = ["Refrigerator", "Cabinet/Shelves", "Others"];
const TOILET_FACILITIES = ["Flush with septic tank", "Flush with sewer system", "Water sealed (pit)", "Pit privy", "Others"];
const GARBAGE_DISPOSAL = ["City collection system", "Communal pit", "Backyard pit", "Open dump", "Composting", "Burning", "Others"];
const COMMUNICATION_SERVICES = ["Telephone", "Cellular networks", "Internet", "Postal Services", "Others"];
const MEANS_OF_TRANSPORT = ["PUB", "PUJ", "Taxi", "Private car", "Motorcycle", "Bicycle", "Others"];
const INFO_SOURCES = ["TV", "Radio", "Newspaper", "Internet", "Others"];

const EcologicalProfileTab = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [households, setHouseholds] = useState<HouseholdData[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdData | null>(null);
  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary>({ total: 0, byType: {}, resolved: 0, pending: 0 });
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Census form state
  const [censusData, setCensusData] = useState<{
    interviewDate: string;
    respondentName: string;
    healthData: {
      malnutrition_0_11: { first: number; second: number };
      malnutrition_1_4: { first: number; second: number };
      malnutrition_5_7: { first: number; second: number };
    };
    immunizationData: {
      bornAlive: { registered: number; notRegistered: number };
      bornDead: { registered: number; notRegistered: number };
      stillBirth: { registered: number; notRegistered: number };
    };
    educationData: {
      preschool: { graduate: number; undergraduate: number };
      primary: { graduate: number; undergraduate: number };
      secondary: { graduate: number; undergraduate: number };
      vocational: { graduate: number; undergraduate: number };
      college: { graduate: number; undergraduate: number };
      postGraduate: { graduate: number; undergraduate: number };
    };
    familyPlanning: {
      isAcceptor: boolean;
      type: string;
    };
  }>({
    interviewDate: format(new Date(), "yyyy-MM-dd"),
    respondentName: "",
    healthData: {
      malnutrition_0_11: { first: 0, second: 0 },
      malnutrition_1_4: { first: 0, second: 0 },
      malnutrition_5_7: { first: 0, second: 0 },
    },
    immunizationData: {
      bornAlive: { registered: 0, notRegistered: 0 },
      bornDead: { registered: 0, notRegistered: 0 },
      stillBirth: { registered: 0, notRegistered: 0 },
    },
    educationData: {
      preschool: { graduate: 0, undergraduate: 0 },
      primary: { graduate: 0, undergraduate: 0 },
      secondary: { graduate: 0, undergraduate: 0 },
      vocational: { graduate: 0, undergraduate: 0 },
      college: { graduate: 0, undergraduate: 0 },
      postGraduate: { graduate: 0, undergraduate: 0 },
    },
    familyPlanning: {
      isAcceptor: false,
      type: "",
    },
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
      const householdsWithResidents = (householdsData || []).map((h) => ({
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
          .filter((r) => r.household_id === h.id)
          .map((r) => ({
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

  // Validate data before finalization
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

    // Check required household fields
    if (!selectedHousehold.house_ownership) {
      warnings.push({
        field: "house_ownership",
        message: "House ownership status not specified",
        severity: "warning",
        householdId: selectedHousehold.id,
      });
    }

    if (!selectedHousehold.dwelling_type) {
      warnings.push({
        field: "dwelling_type",
        message: "Dwelling type not specified",
        severity: "warning",
        householdId: selectedHousehold.id,
      });
    }

    if (!selectedHousehold.lighting_source) {
      warnings.push({
        field: "lighting_source",
        message: "Lighting source not specified",
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
    } else {
      // Check for household head
      const hasHead = selectedHousehold.residents.some((r) => r.is_head_of_household);
      if (!hasHead) {
        warnings.push({
          field: "household_head",
          message: "No household head designated",
          severity: "warning",
          householdId: selectedHousehold.id,
        });
      }

      // Check resident data completeness
      selectedHousehold.residents.forEach((resident, index) => {
        if (!resident.birth_date) {
          warnings.push({
            field: `resident_${index}_birth_date`,
            message: `${resident.first_name} ${resident.last_name}: Birth date missing`,
            severity: "warning",
            householdId: selectedHousehold.id,
          });
        }
        if (!resident.gender) {
          warnings.push({
            field: `resident_${index}_gender`,
            message: `${resident.first_name} ${resident.last_name}: Gender not specified`,
            severity: "warning",
            householdId: selectedHousehold.id,
          });
        }
      });
    }

    // Environmental data validation
    if (!selectedHousehold.toilet_facilities || selectedHousehold.toilet_facilities.length === 0) {
      warnings.push({
        field: "toilet_facilities",
        message: "Toilet facilities not specified",
        severity: "warning",
        householdId: selectedHousehold.id,
      });
    }

    if (!selectedHousehold.garbage_disposal || selectedHousehold.garbage_disposal.length === 0) {
      warnings.push({
        field: "garbage_disposal",
        message: "Garbage disposal method not specified",
        severity: "warning",
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

  useEffect(() => {
    if (currentStep === 4) {
      validateData();
    }
  }, [currentStep, validateData]);

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

  // Generate PDF report
  const generateReport = async (type: "pdf" | "print") => {
    if (!selectedHousehold) {
      toast.error("Please select a household first");
      return;
    }

    const errors = validationWarnings.filter((w) => w.severity === "error");
    if (errors.length > 0) {
      toast.error("Please fix all errors before generating the report");
      return;
    }

    setIsGenerating(true);
    try {
      // Open print dialog with styled report
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

  // Styles for the report (used in both preview and print)
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

  // Generate body content (reusable for both preview and full report)
  const generateBodyContent = (): string => {
    if (!selectedHousehold) return "";

    const household = selectedHousehold;
    const residents = household.residents || [];
    const headOfHousehold = residents.find((r) => r.is_head_of_household) || residents[0];

    return `
  <div class="report-container">
  <!-- Page 1: Household & Respondent Information -->
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
      <div class="section-title">Health (Children Malnutrition)</div>
      <table>
        <thead>
          <tr>
            <th>Age Group</th>
            <th>1st Degree (No.)</th>
            <th>2nd Degree (No.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0-11 mos. old</td>
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

    <div class="footer">Page 1 of 3</div>
  </div>

  <!-- Page 2: Household Members -->
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
      <div class="section-title">EQUIVALENTS</div>
      <div class="two-column" style="font-size: 10px;">
        <div>
          <strong>(c) Sex:</strong> M - Male, F - Female<br/>
          <strong>(f) Civil Status:</strong> S - Single, M - Married, W - Widowed, Sep - Separated<br/>
          <strong>(h) Schooling:</strong> IS - In school, OS - Out of school, NYS - Not yet in school, G - Graduate
        </div>
        <div>
          <strong>(k) Employment Status:</strong> P - Permanent, C - Contractual, T - Temporary, SE - Self-employed<br/>
          <strong>Employment Category:</strong> Priv - Private, Gov - Government, SE - Self Employed<br/>
          <strong>Income Ranges:</strong> 3k & below, 3001-4999, 5000-6999, 7000-8999, 9000-10999, etc.
        </div>
      </div>
    </div>

    <div class="footer">Page 2 of 3</div>
  </div>

  <!-- Page 3: Environmental Sanitation & Health -->
  <div class="page">
    <div class="header">
      <h2>ENVIRONMENTAL SANITATION - ${household.household_number}</h2>
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
      <div class="section-title">Health Information - Immunized Children (0-6 years old)</div>
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
      <div class="section-title">Family Planning</div>
      <div class="checkbox-group">
        <span class="checkbox-item">
          <span class="checkbox ${censusData.familyPlanning.isAcceptor ? "checked" : ""}"></span>
          Yes, Acceptor
        </span>
        <span class="checkbox-item">
          <span class="checkbox ${!censusData.familyPlanning.isAcceptor ? "checked" : ""}"></span>
          No
        </span>
      </div>
      ${censusData.familyPlanning.isAcceptor ? `<div style="margin-top: 5px;"><strong>Type:</strong> ${censusData.familyPlanning.type}</div>` : ""}
    </div>

    <div class="section">
      <div class="section-title">Community Incidents Summary</div>
      <table>
        <thead>
          <tr>
            <th>Incident Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(incidentSummary.byType).map(([type, count]) => `
            <tr>
              <td>${type}</td>
              <td>${count}</td>
            </tr>
          `).join("")}
          <tr style="font-weight: bold;">
            <td>Total Incidents</td>
            <td>${incidentSummary.total}</td>
          </tr>
          <tr>
            <td>Resolved</td>
            <td>${incidentSummary.resolved}</td>
          </tr>
          <tr>
            <td>Pending</td>
            <td>${incidentSummary.pending}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      Page 3 of 3<br/>
      Generated on ${format(new Date(), "MMMM dd, yyyy 'at' h:mm a")}
    </div>
  </div>
  </div>
    `;
  };

  // Generate preview content with inline styles (for dialog preview)
  const generatePreviewContent = (): string => {
    if (!selectedHousehold) return "<p class='text-muted-foreground'>No household selected</p>";
    return `<style>${getReportStyles()}</style>${generateBodyContent()}`;
  };

  // Generate full HTML for print/export (opens in new window)
  const generateReportHTML = (): string => {
    if (!selectedHousehold) return "";
    
    const household = selectedHousehold;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barangay Ecological Profile Census - ${household.household_number}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
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

  const handleSelectHousehold = (household: HouseholdData) => {
    setSelectedHousehold(household);
    const head = household.residents?.find((r) => r.is_head_of_household);
    if (head) {
      setCensusData((prev) => ({
        ...prev,
        respondentName: `${head.first_name} ${head.middle_name || ""} ${head.last_name}`.trim(),
      }));
    }
    toast.success(`Selected household: ${household.household_number}`);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
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
                <div className="mb-4">
                  <Input
                    placeholder="Search by household number, address, or resident name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Household #</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Head of Household</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHouseholds.map((h) => {
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
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Residents Table */}
            {selectedHousehold && selectedHousehold.residents && selectedHousehold.residents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Household Members ({selectedHousehold.residents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Relation</TableHead>
                          <TableHead>Age</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Civil Status</TableHead>
                          <TableHead>Education</TableHead>
                          <TableHead>Employment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedHousehold.residents.map((r, i) => (
                          <TableRow key={r.id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">
                              {r.last_name}, {r.first_name} {r.middle_name || ""} {r.suffix || ""}
                              {r.is_head_of_household && (
                                <Badge variant="outline" className="ml-2">Head</Badge>
                              )}
                            </TableCell>
                            <TableCell>{r.relation_to_head || (r.is_head_of_household ? "Head" : "-")}</TableCell>
                            <TableCell>{calculateAge(r.birth_date)}</TableCell>
                            <TableCell>{r.gender || "-"}</TableCell>
                            <TableCell>{r.civil_status || "-"}</TableCell>
                            <TableCell>{r.education_attainment || "-"}</TableCell>
                            <TableCell>{r.employment_status || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {!selectedHousehold ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Household Selected</AlertTitle>
                <AlertDescription>Please go back and select a household first.</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Environmental Data Display */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Droplets className="h-5 w-5" />
                      Environmental Sanitation Data
                    </CardTitle>
                    <CardDescription>
                      Data synced from Manage Households for {selectedHousehold.household_number}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="font-semibold">Water Supply Source</Label>
                          <p className="mt-1">{selectedHousehold.water_supply_level || <span className="text-muted-foreground">Not specified</span>}</p>
                        </div>
                        <div>
                          <Label className="font-semibold">Water Storage</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedHousehold.water_storage && selectedHousehold.water_storage.length > 0 ? (
                              selectedHousehold.water_storage.map((s) => (
                                <Badge key={s} variant="secondary">{s}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="font-semibold">Food Storage</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedHousehold.food_storage_type && selectedHousehold.food_storage_type.length > 0 ? (
                              selectedHousehold.food_storage_type.map((s) => (
                                <Badge key={s} variant="secondary">{s}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="font-semibold">Toilet Facilities</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedHousehold.toilet_facilities && selectedHousehold.toilet_facilities.length > 0 ? (
                              selectedHousehold.toilet_facilities.map((t) => (
                                <Badge key={t} variant="secondary">{t}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="font-semibold">Garbage Disposal</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedHousehold.garbage_disposal && selectedHousehold.garbage_disposal.length > 0 ? (
                              selectedHousehold.garbage_disposal.map((g) => (
                                <Badge key={g} variant="secondary">{g}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="font-semibold">Drainage Facilities</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedHousehold.drainage_facilities && selectedHousehold.drainage_facilities.length > 0 ? (
                              selectedHousehold.drainage_facilities.map((d) => (
                                <Badge key={d} variant="secondary">{d}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Not specified</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Health Data Entry */}
                <Card>
                  <CardHeader>
                    <CardTitle>Health Data Entry</CardTitle>
                    <CardDescription>Enter additional health information for this household</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="font-semibold mb-3 block">Children Malnutrition Data</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Age Group</TableHead>
                            <TableHead>1st Degree</TableHead>
                            <TableHead>2nd Degree</TableHead>
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
                    </div>

                    <Separator />

                    <div>
                      <Label className="font-semibold mb-3 block">Education Statistics (Household)</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Level</TableHead>
                            <TableHead>Graduate</TableHead>
                            <TableHead>Undergraduate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { key: "preschool", label: "Pre-school/Day care" },
                            { key: "primary", label: "Primary/Elementary" },
                            { key: "secondary", label: "Secondary/High School" },
                            { key: "vocational", label: "Vocational/Technical" },
                            { key: "college", label: "College/University" },
                            { key: "postGraduate", label: "Post Graduate" },
                          ].map((level) => (
                            <TableRow key={level.key}>
                              <TableCell>{level.label}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={censusData.educationData[level.key as keyof typeof censusData.educationData].graduate}
                                  onChange={(e) => setCensusData((prev) => ({
                                    ...prev,
                                    educationData: {
                                      ...prev.educationData,
                                      [level.key]: { 
                                        ...prev.educationData[level.key as keyof typeof prev.educationData], 
                                        graduate: parseInt(e.target.value) || 0 
                                      },
                                    },
                                  }))}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={censusData.educationData[level.key as keyof typeof censusData.educationData].undergraduate}
                                  onChange={(e) => setCensusData((prev) => ({
                                    ...prev,
                                    educationData: {
                                      ...prev.educationData,
                                      [level.key]: { 
                                        ...prev.educationData[level.key as keyof typeof prev.educationData], 
                                        undergraduate: parseInt(e.target.value) || 0 
                                      },
                                    },
                                  }))}
                                  className="w-20"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Incidents Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Community Incidents Summary
                </CardTitle>
                <CardDescription>Data synced from Incident/Blotter module</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{incidentSummary.total}</div>
                      <p className="text-xs text-muted-foreground">Total Incidents</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{incidentSummary.resolved}</div>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-yellow-600">{incidentSummary.pending}</div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{Object.keys(incidentSummary.byType).length}</div>
                      <p className="text-xs text-muted-foreground">Incident Types</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incident Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(incidentSummary.byType).map(([type, count]) => (
                      <TableRow key={type}>
                        <TableCell>{type}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>
                          {incidentSummary.total > 0 
                            ? `${((count / incidentSummary.total) * 100).toFixed(1)}%` 
                            : "0%"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card>
              <CardHeader>
                <CardTitle>Immunization & Birth Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Birth Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Not Registered</TableHead>
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

                <Separator />

                <div className="space-y-4">
                  <Label className="font-semibold">Family Planning</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={censusData.familyPlanning.isAcceptor}
                        onCheckedChange={(checked) => setCensusData((prev) => ({
                          ...prev,
                          familyPlanning: { ...prev.familyPlanning, isAcceptor: !!checked },
                        }))}
                      />
                      <Label>Family Planning Acceptor</Label>
                    </div>
                    {censusData.familyPlanning.isAcceptor && (
                      <Input
                        placeholder="Type of family planning method"
                        value={censusData.familyPlanning.type}
                        onChange={(e) => setCensusData((prev) => ({
                          ...prev,
                          familyPlanning: { ...prev.familyPlanning, type: e.target.value },
                        }))}
                        className="max-w-xs"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        const populationStats = getPopulationStats();
        const errors = validationWarnings.filter((w) => w.severity === "error");
        const warnings = validationWarnings.filter((w) => w.severity === "warning");

        return (
          <div className="space-y-6">
            {/* Validation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Validation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Errors Found ({errors.length})</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2">
                        {errors.map((e, i) => (
                          <li key={i}>{e.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {warnings.length > 0 && (
                  <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Warnings ({warnings.length})</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2">
                        {warnings.map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {errors.length === 0 && warnings.length === 0 && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-600">All Validations Passed</AlertTitle>
                    <AlertDescription className="text-green-600">
                      The census data is complete and ready for report generation.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{households.length}</div>
                  <p className="text-xs text-muted-foreground">Total Households</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{populationStats.total}</div>
                  <p className="text-xs text-muted-foreground">Total Population</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">{populationStats.male}</div>
                  <p className="text-xs text-muted-foreground">Male</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-pink-600">{populationStats.female}</div>
                  <p className="text-xs text-muted-foreground">Female</p>
                </CardContent>
              </Card>
            </div>

            {/* Selected Household Summary */}
            {selectedHousehold && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Household: {selectedHousehold.household_number}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Address:</strong> {selectedHousehold.street_purok || selectedHousehold.address || "-"}
                    </div>
                    <div>
                      <strong>Members:</strong> {selectedHousehold.residents?.length || 0}
                    </div>
                    <div>
                      <strong>Interview Date:</strong> {censusData.interviewDate ? format(new Date(censusData.interviewDate), "MMMM dd, yyyy") : "-"}
                    </div>
                    <div>
                      <strong>Respondent:</strong> {censusData.respondentName || "-"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Report</CardTitle>
                <CardDescription>Generate a print-ready Barangay Ecological Profile Census report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setShowPreview(true)}
                    variant="outline"
                    disabled={errors.length > 0 || !selectedHousehold}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Report
                  </Button>
                  <Button
                    onClick={() => generateReport("print")}
                    disabled={errors.length > 0 || isGenerating || !selectedHousehold}
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
                    disabled={errors.length > 0 || isGenerating || !selectedHousehold}
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

      default:
        return null;
    }
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
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Step Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : currentStep > step.id
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-muted border-muted-foreground/20"
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center ${currentStep === step.id ? "font-semibold" : ""}`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      currentStep > step.id ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={() => setCurrentStep((prev) => Math.min(STEPS.length, prev + 1))}
          disabled={currentStep === STEPS.length}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

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

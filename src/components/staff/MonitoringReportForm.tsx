import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, Save, Send, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getMonitoringReport, createMonitoringReport, updateMonitoringReport } from "@/utils/staffApi";
import { useStaffAuthContext } from "@/context/StaffAuthContext";

const AGE_BRACKETS = [
  "Under 5 years old",
  "5–9 years old",
  "10–14 years old",
  "15–19 years old",
  "20–24 years old",
  "25–29 years old",
  "30–34 years old",
  "35–39 years old",
  "40–44 years old",
  "45–49 years old",
  "50–54 years old",
  "55–59 years old",
  "60–64 years old",
  "65–69 years old",
  "70–74 years old",
  "75–79 years old",
  "80 years old and over",
];

interface AgeBracketRow {
  bracket: string;
  male: number;
  female: number;
}

interface SectorRow {
  label: string;
  key: string;
  male: number;
  female: number;
}

const SECTOR_ITEMS: { label: string; key: string }[] = [
  { label: "Labor Force", key: "labor_force" },
  { label: "Unemployed", key: "unemployed" },
  { label: "Out of School Children (6–14)", key: "osc" },
  { label: "Out of School Youth", key: "osy" },
  { label: "Persons with Disabilities (PWDs)", key: "pwd" },
  { label: "Overseas Filipino Workers (OFWs)", key: "ofw" },
  { label: "Solo Parents", key: "solo_parents" },
  { label: "Indigenous Peoples (IPs)", key: "ips" },
  { label: "Civil Status – Single (18+)", key: "single" },
  { label: "Civil Status – Married (18+)", key: "married" },
  { label: "Citizenship – Filipino", key: "filipino" },
  { label: "Citizenship – Foreigner", key: "foreigner" },
];

interface MonitoringReportFormProps {
  reportId?: string;
  readOnly?: boolean;
  onBack: () => void;
}

const MonitoringReportForm = ({ reportId, readOnly = false, onBack }: MonitoringReportFormProps) => {
  const { user } = useStaffAuthContext();
  const [isLoading, setIsLoading] = useState(!!reportId);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Basic info
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [cityMunicipality, setCityMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [totalInhabitants, setTotalInhabitants] = useState(0);
  const [totalRegisteredVoters, setTotalRegisteredVoters] = useState(0);
  const [totalHouseholds, setTotalHouseholds] = useState(0);
  const [totalFamilies, setTotalFamilies] = useState(0);
  const [averageHouseholdSize, setAverageHouseholdSize] = useState(0);
  const [semester, setSemester] = useState<string>("");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Age bracket data
  const [ageBrackets, setAgeBrackets] = useState<AgeBracketRow[]>(
    AGE_BRACKETS.map((b) => ({ bracket: b, male: 0, female: 0 }))
  );

  // Sector data
  const [sectors, setSectors] = useState<SectorRow[]>(
    SECTOR_ITEMS.map((s) => ({ ...s, male: 0, female: 0 }))
  );

  // Load existing report
  useEffect(() => {
    if (!reportId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const d = await getMonitoringReport(reportId);
        if (!d) return;

        setRegion(d.region || "");
        setProvince(d.province || "");
        setCityMunicipality(d.city_municipality || "");
        setBarangay(d.barangay || "");
        setTotalInhabitants(d.total_inhabitants || 0);
        setTotalRegisteredVoters(d.total_registered_voters || 0);
        setTotalHouseholds(d.total_households || 0);
        setTotalFamilies(d.total_families || 0);
        setAverageHouseholdSize(d.average_household_size || 0);
        setSemester(d.semester || "");
        setCalendarYear(d.calendar_year || new Date().getFullYear());

        if (d.age_bracket_data && Array.isArray(d.age_bracket_data)) {
          const parsed = AGE_BRACKETS.map((bracket) => {
            const found = (d.age_bracket_data as any[]).find(
              (ab: any) => ab.bracket === bracket
            );
            return found || { bracket, male: 0, female: 0 };
          });
          setAgeBrackets(parsed);
        }

        if (d.sector_data && typeof d.sector_data === "object") {
          const sd = d.sector_data as Record<string, any>;
          setSectors(
            SECTOR_ITEMS.map((s) => ({
              ...s,
              male: sd[s.key]?.male || 0,
              female: sd[s.key]?.female || 0,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading report:", error);
        toast.error("Failed to load report");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [reportId]);

  const ageBracketTotals = useMemo(() => {
    let totalMale = 0;
    let totalFemale = 0;
    ageBrackets.forEach((r) => {
      totalMale += r.male;
      totalFemale += r.female;
    });
    return { totalMale, totalFemale, grandTotal: totalMale + totalFemale };
  }, [ageBrackets]);

  const sectorTotals = useMemo(() => {
    let totalMale = 0;
    let totalFemale = 0;
    sectors.forEach((r) => {
      totalMale += r.male;
      totalFemale += r.female;
    });
    return { totalMale, totalFemale };
  }, [sectors]);

  const updateAgeBracket = (index: number, field: "male" | "female", value: number) => {
    setAgeBrackets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateSector = (index: number, field: "male" | "female", value: number) => {
    setSectors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const buildPayload = (status: string) => {
    const sectorData: Record<string, { male: number; female: number }> = {};
    sectors.forEach((s) => {
      sectorData[s.key] = { male: s.male, female: s.female };
    });

    return {
      region,
      province,
      city_municipality: cityMunicipality,
      barangay,
      total_inhabitants: totalInhabitants,
      total_registered_voters: totalRegisteredVoters,
      total_households: totalHouseholds,
      total_families: totalFamilies,
      average_household_size: averageHouseholdSize,
      semester: semester || null,
      calendar_year: calendarYear,
      age_bracket_data: ageBrackets.map((ab) => ({
        bracket: ab.bracket,
        male: ab.male,
        female: ab.female,
      })),
      sector_data: sectorData,
      status,
      updated_by: user?.fullName || "Admin",
    };
  };

  const handleSave = async (asSubmitted = false) => {
    const status = asSubmitted ? "submitted" : "draft";
    setIsSaving(true);
    try {
      const payload = buildPayload(status);

      if (reportId) {
        await updateMonitoringReport(reportId, payload as Record<string, unknown>);
      } else {
        await createMonitoringReport({ ...payload, created_by: user?.fullName || "Admin" } as Record<string, unknown>);
      }

      toast.success(
        asSubmitted
          ? "Report submitted successfully"
          : "Report saved as draft"
      );
      onBack();
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error(error.message || "Failed to save report");
    } finally {
      setIsSaving(false);
      setShowSubmitDialog(false);
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">
                {readOnly ? "View" : reportId ? "Edit" : "New"} Monitoring Report
              </h2>
              <p className="text-sm text-muted-foreground">
                RBI Form C – Revised 2024
              </p>
            </div>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => setShowSubmitDialog(true)} disabled={isSaving}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          )}
        </div>

        {/* Section 1: Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Region</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>City/Municipality</Label>
                <Input value={cityMunicipality} onChange={(e) => setCityMunicipality(e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Input value={barangay} onChange={(e) => setBarangay(e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Total Barangay Inhabitants</Label>
                <Input type="number" value={totalInhabitants} onChange={(e) => setTotalInhabitants(Number(e.target.value))} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Total Registered Voters</Label>
                <Input type="number" value={totalRegisteredVoters} onChange={(e) => setTotalRegisteredVoters(Number(e.target.value))} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Total Households</Label>
                <Input type="number" value={totalHouseholds} onChange={(e) => setTotalHouseholds(Number(e.target.value))} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Total Families</Label>
                <Input type="number" value={totalFamilies} onChange={(e) => setTotalFamilies(Number(e.target.value))} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Average Household Size</Label>
                <Input type="number" step="0.01" value={averageHouseholdSize} onChange={(e) => setAverageHouseholdSize(Number(e.target.value))} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semester} onValueChange={setSemester} disabled={readOnly}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calendar Year</Label>
                <Input type="number" value={calendarYear} onChange={(e) => setCalendarYear(Number(e.target.value))} disabled={readOnly} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Population by Age Bracket */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. Population by Age Bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Age Bracket</TableHead>
                    <TableHead className="w-[120px] text-center">Male</TableHead>
                    <TableHead className="w-[120px] text-center">Female</TableHead>
                    <TableHead className="w-[120px] text-center font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ageBrackets.map((row, index) => (
                    <TableRow key={row.bracket}>
                      <TableCell className="font-medium text-sm">{row.bracket}</TableCell>
                      <TableCell className="text-center">
                        {readOnly ? (
                          <span>{row.male}</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            className="w-20 mx-auto text-center h-8"
                            value={row.male}
                            onChange={(e) => updateAgeBracket(index, "male", Number(e.target.value) || 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {readOnly ? (
                          <span>{row.female}</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            className="w-20 mx-auto text-center h-8"
                            value={row.female}
                            onChange={(e) => updateAgeBracket(index, "female", Number(e.target.value) || 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {row.male + row.female}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-center">{ageBracketTotals.totalMale}</TableCell>
                    <TableCell className="text-center">{ageBracketTotals.totalFemale}</TableCell>
                    <TableCell className="text-center">{ageBracketTotals.grandTotal}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Population by Sector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Population by Sector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px]">Sector</TableHead>
                    <TableHead className="w-[120px] text-center">Male</TableHead>
                    <TableHead className="w-[120px] text-center">Female</TableHead>
                    <TableHead className="w-[120px] text-center font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors.map((row, index) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-sm">{row.label}</TableCell>
                      <TableCell className="text-center">
                        {readOnly ? (
                          <span>{row.male}</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            className="w-20 mx-auto text-center h-8"
                            value={row.male}
                            onChange={(e) => updateSector(index, "male", Number(e.target.value) || 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {readOnly ? (
                          <span>{row.female}</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            className="w-20 mx-auto text-center h-8"
                            value={row.female}
                            onChange={(e) => updateSector(index, "female", Number(e.target.value) || 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {row.male + row.female}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bottom actions */}
        {!readOnly && (
          <div className="flex justify-end gap-2 pb-6">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={() => setShowSubmitDialog(true)} disabled={isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Submit Report
            </Button>
          </div>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Monitoring Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this report? Once submitted, the report will become read-only and cannot be edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSave(true)} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Confirm Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MonitoringReportForm;

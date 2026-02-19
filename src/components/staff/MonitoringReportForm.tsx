import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft, Save, Send, Loader2, Printer, CalendarIcon,
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { getMonitoringReport, createMonitoringReport, updateMonitoringReport } from "@/utils/staffApi";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import MonitoringReportPrint from "./MonitoringReportPrint";

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

  const printRef = useRef<HTMLDivElement>(null);

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

  // Signature fields
  const [preparedByName, setPreparedByName] = useState("");
  const [submittedByName, setSubmittedByName] = useState("");
  const [dateAccomplished, setDateAccomplished] = useState<Date | undefined>(undefined);

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

        // Signature fields
        setPreparedByName(d.prepared_by_name || "");
        setSubmittedByName(d.submitted_by_name || "");
        if (d.date_accomplished) {
          setDateAccomplished(new Date(d.date_accomplished));
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
      prepared_by_name: preparedByName || null,
      submitted_by_name: submittedByName || null,
      date_accomplished: dateAccomplished ? format(dateAccomplished, "yyyy-MM-dd") : null,
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
          : reportId
            ? "Monitoring Report successfully updated."
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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;
    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RBI Form C - Monitoring Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; }
          .print-report { padding: 20mm; max-width: 210mm; margin: 0 auto; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.5em; }
          th, td { border: 1px solid #000; padding: 2px 6px; font-size: 10pt; }
          th { background: #f0f0f0; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-xs { font-size: 9pt; }
          .text-sm { font-size: 10pt; }
          .text-lg { font-size: 14pt; }
          .font-bold, strong { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .italic { font-style: italic; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mb-8 { margin-bottom: 32px; }
          .mt-1 { margin-top: 4px; }
          .pt-2 { padding-top: 8px; }
          .pb-1 { padding-bottom: 4px; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .p-8 { padding: 32px; }
          .min-w-\\[150px\\] { min-width: 150px; }
          .min-w-\\[200px\\] { min-width: 200px; }
          .w-20 { width: 80px; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .gap-x-4 { column-gap: 16px; }
          .gap-x-8 { column-gap: 32px; }
          .gap-y-1 { row-gap: 4px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-start { align-items: flex-start; }
          .inline-block { display: inline-block; }
          .border-b { border-bottom: 1px solid #000; }
          .border-t { border-top: 1px solid #ccc; }
          .border-black { border-color: #000; }
          .border-gray-300 { border-color: #ccc; }
          .bg-gray-100 { background: #f0f0f0; }
          .text-gray-600 { color: #666; }
          .tracking-wider { letter-spacing: 0.05em; }
          .tracking-wide { letter-spacing: 0.025em; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
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
          {readOnly && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
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
        {/* Section 4: Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Signatories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Prepared by:</Label>
                <Input
                  value={preparedByName}
                  onChange={(e) => setPreparedByName(e.target.value)}
                  disabled={readOnly}
                  placeholder="Enter name"
                />
                <p className="text-sm font-medium">Position: Barangay Secretary</p>
                <p className="text-xs text-muted-foreground italic">(Signature over Printed Name)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Submitted by:</Label>
                <Input
                  value={submittedByName}
                  onChange={(e) => setSubmittedByName(e.target.value)}
                  disabled={readOnly}
                  placeholder="Enter name"
                />
                <p className="text-sm font-medium">Position: Punong Barangay</p>
                <p className="text-xs text-muted-foreground italic">(Signature over Printed Name)</p>
              </div>
            </div>
            <div className="mt-6 max-w-xs space-y-2">
              <Label>Date Accomplished</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateAccomplished && "text-muted-foreground"
                    )}
                    disabled={readOnly}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateAccomplished ? format(dateAccomplished, "MMMM d, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateAccomplished}
                    onSelect={setDateAccomplished}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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

      {/* Hidden print component */}
      <div className="hidden">
        <MonitoringReportPrint
          ref={printRef}
          region={region}
          province={province}
          cityMunicipality={cityMunicipality}
          barangay={barangay}
          totalInhabitants={totalInhabitants}
          totalRegisteredVoters={totalRegisteredVoters}
          totalHouseholds={totalHouseholds}
          totalFamilies={totalFamilies}
          averageHouseholdSize={averageHouseholdSize}
          semester={semester}
          calendarYear={calendarYear}
          ageBrackets={ageBrackets}
          sectors={sectors}
          preparedByName={preparedByName}
          submittedByName={submittedByName}
          dateAccomplished={dateAccomplished ? format(dateAccomplished, "MMMM d, yyyy") : ""}
        />
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

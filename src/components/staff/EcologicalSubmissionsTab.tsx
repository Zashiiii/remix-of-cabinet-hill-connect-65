import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Home,
  RefreshCw,
  AlertCircle,
  Users,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { createAuditLog } from "@/utils/auditLog";
import { 
  exportSubmissionsToCSV, 
  exportMembersToCSV, 
  downloadCSV, 
  parseCSV, 
  validateImportData,
  generateImportTemplate,
  type EcologicalSubmission 
} from "@/utils/ecologicalCsv";

interface HouseholdMember {
  id?: string;
  full_name?: string;
  relation_to_head?: string;
  relationship_to_head?: string; // Alternative field name
  birth_date?: string;
  age?: number;
  gender?: string;
  civil_status?: string;
  religion?: string;
  contact_number?: string;
  occupation?: string;
  education_attainment?: string;
  education_level?: string; // Alternative field name
  schooling_status?: string;
  employment_status?: string;
  employment_category?: string;
  monthly_income_cash?: string;
  monthly_income_kind?: string;
  monthly_income?: string; // Alternative field name
  is_head_of_household?: boolean;
  is_pwd?: boolean;
  is_solo_parent?: boolean;
}

// Helper to get member field value with fallback
const getMemberValue = (member: HouseholdMember, ...keys: (keyof HouseholdMember)[]) => {
  for (const key of keys) {
    const value = member[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return null;
};

interface Submission {
  id: string;
  submission_number: string;
  status: string;
  household_number: string | null;
  address: string | null;
  street_purok: string | null;
  house_number: string | null;
  respondent_name: string | null;
  respondent_relation: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  staff_notes: string | null;
  submitted_by_resident_id: string | null;
  interview_date: string | null;
  // Location data
  barangay: string | null;
  city: string | null;
  province: string | null;
  district: string | null;
  // Housing data
  house_ownership: string | null;
  lot_ownership: string | null;
  dwelling_type: string | null;
  lighting_source: string | null;
  water_supply_level: string | null;
  years_staying: number | null;
  place_of_origin: string | null;
  ethnic_group: string | null;
  // Array fields
  water_storage: string[] | null;
  food_storage_type: string[] | null;
  toilet_facilities: string[] | null;
  drainage_facilities: string[] | null;
  garbage_disposal: string[] | null;
  communication_services: string[] | null;
  means_of_transport: string[] | null;
  info_sources: string[] | null;
  // Additional counts
  is_4ps_beneficiary: boolean | null;
  solo_parent_count: number | null;
  pwd_count: number | null;
  additional_notes: string | null;
  // JSON data fields
  household_members: HouseholdMember[] | null;
  health_data: Record<string, unknown> | null;
  immunization_data: Record<string, unknown> | null;
  education_data: Record<string, unknown> | null;
  family_planning: Record<string, unknown> | null;
  pregnant_data: Record<string, unknown> | null;
  disability_data: Record<string, unknown> | null;
  senior_data: Record<string, unknown> | null;
  death_data: Record<string, unknown> | null;
  food_production: Record<string, unknown> | null;
  animals: Record<string, unknown> | null;
  // Soft delete fields
  deleted_at: string | null;
  deleted_by: string | null;
}

const EcologicalSubmissionsTab = () => {
  const { user: staffUser } = useStaffAuthContext();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [showDeletedFilter, setShowDeletedFilter] = useState(false);
  const [sortField, setSortField] = useState<'created_at' | 'submission_number' | 'household_number' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // CSV Import/Export state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_all_ecological_submissions_for_staff", {
        p_status: statusFilter === "all" || statusFilter === "deleted" ? null : statusFilter,
        p_include_deleted: showDeletedFilter || statusFilter === "deleted"
      });

      if (error) throw error;
      
      // Filter for deleted if that's the selected filter
      let filteredData = data || [];
      if (statusFilter === "deleted") {
        filteredData = filteredData.filter((s: any) => s.deleted_at !== null);
      } else if (!showDeletedFilter) {
        filteredData = filteredData.filter((s: any) => s.deleted_at === null);
      }
      
      setSubmissions(filteredData as Submission[]);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showDeletedFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("ecological-submissions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ecological_profile_submissions",
        },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSubmissions]);

  const filteredSubmissions = submissions.filter((sub) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      sub.submission_number?.toLowerCase().includes(searchLower) ||
      sub.household_number?.toLowerCase().includes(searchLower) ||
      sub.respondent_name?.toLowerCase().includes(searchLower) ||
      sub.address?.toLowerCase().includes(searchLower)
    );
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const sortedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'submission_number':
          comparison = (a.submission_number || '').localeCompare(b.submission_number || '');
          break;
        case 'household_number':
          comparison = (a.household_number || '').localeCompare(b.household_number || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredSubmissions, sortField, sortOrder]);

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission);
    setShowDetailsDialog(true);
  };

  const handleReview = (submission: Submission, action: "approve" | "reject") => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setRejectionReason("");
    setStaffNotes("");
    setShowReviewDialog(true);
  };

  const processReview = async () => {
    if (!selectedSubmission || !staffUser) return;

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      const newStatus = reviewAction === "approve" ? "approved" : "rejected";

      const { error } = await supabase.rpc("review_ecological_submission", {
        p_submission_id: selectedSubmission.id,
        p_status: newStatus,
        p_reviewed_by: staffUser.fullName,
        p_rejection_reason: reviewAction === "reject" ? rejectionReason : null,
        p_staff_notes: staffNotes || null
      });

      if (error) throw error;

      // If approved, apply to households table
      if (reviewAction === "approve") {
        const { error: applyError } = await supabase.rpc("apply_ecological_submission_to_household", {
          p_submission_id: selectedSubmission.id
        });

        if (applyError) {
          console.error("Error applying to household:", applyError);
          toast.warning("Submission approved but failed to update household data");
        }
      }

      // Log audit
      await createAuditLog({
        action: reviewAction === "approve" ? "approve" : "reject",
        entityType: "ecological_submission",
        entityId: selectedSubmission.submission_number,
        performedBy: staffUser.fullName,
        performedByType: "staff",
        details: {
          household_number: selectedSubmission.household_number,
          respondent: selectedSubmission.respondent_name,
          reason: reviewAction === "reject" ? rejectionReason : undefined
        }
      });

      toast.success(
        reviewAction === "approve" 
          ? "Submission approved and applied to household records" 
          : "Submission rejected"
      );

      setShowReviewDialog(false);
      loadSubmissions();
    } catch (error: any) {
      console.error("Error processing review:", error);
      toast.error("Failed to process review", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubmission = (submission: Submission) => {
    setSubmissionToDelete(submission);
    setShowDeleteDialog(true);
  };

  const processDelete = async () => {
    if (!submissionToDelete || !staffUser) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("soft_delete_ecological_submission", {
        p_submission_id: submissionToDelete.id,
        p_deleted_by: staffUser.fullName
      });

      if (error) throw error;

      await createAuditLog({
        action: "delete",
        entityType: "ecological_submission",
        entityId: submissionToDelete.submission_number,
        performedBy: staffUser.fullName,
        performedByType: "staff",
        details: {
          household_number: submissionToDelete.household_number,
          respondent: submissionToDelete.respondent_name,
          reason: "Soft deleted by staff"
        }
      });

      toast.success("Submission removed successfully");
      setShowDeleteDialog(false);
      setSubmissionToDelete(null);
      loadSubmissions();
    } catch (error: any) {
      console.error("Error deleting submission:", error);
      toast.error("Failed to remove submission", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecoverSubmission = async (submission: Submission) => {
    if (!staffUser) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("recover_ecological_submission", {
        p_submission_id: submission.id
      });

      if (error) throw error;

      await createAuditLog({
        action: "recover",
        entityType: "ecological_submission",
        entityId: submission.submission_number,
        performedBy: staffUser.fullName,
        performedByType: "staff",
        details: {
          household_number: submission.household_number,
          respondent: submission.respondent_name
        }
      });

      toast.success("Submission recovered successfully");
      loadSubmissions();
    } catch (error: any) {
      console.error("Error recovering submission:", error);
      toast.error("Failed to recover submission", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Export handlers
  const handleExportSubmissions = () => {
    if (sortedSubmissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }
    
    const csvContent = exportSubmissionsToCSV(sortedSubmissions as unknown as EcologicalSubmission[]);
    const filename = `ecological-submissions-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    downloadCSV(csvContent, filename);
    toast.success(`Exported ${sortedSubmissions.length} submissions to CSV`);
    
    if (staffUser) {
      createAuditLog({
        action: "export",
        entityType: "ecological_submission",
        entityId: "bulk",
        performedBy: staffUser.fullName,
        performedByType: "staff",
        details: { count: sortedSubmissions.length, format: "csv" }
      });
    }
  };

  const handleExportMembers = () => {
    if (sortedSubmissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }
    
    const csvContent = exportMembersToCSV(sortedSubmissions as unknown as EcologicalSubmission[]);
    const filename = `ecological-members-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    downloadCSV(csvContent, filename);
    toast.success("Exported household members to CSV");
  };

  const handleDownloadTemplate = () => {
    const template = generateImportTemplate();
    downloadCSV(template, 'ecological-import-template.csv');
    toast.success("Template downloaded");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCSV(content);
      const validation = validateImportData(rows);
      
      setImportErrors(validation.errors);
      setImportPreview(validation.data);
      setShowImportDialog(true);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportSubmissions = async () => {
    if (importPreview.length === 0) {
      toast.error("No data to import");
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const submission of importPreview) {
        // Generate submission number
        const { data: submissionNumber, error: numError } = await supabase.rpc(
          "generate_ecological_submission_number"
        );

        if (numError) {
          console.error("Error generating submission number:", numError);
          errorCount++;
          continue;
        }

        const insertData: Record<string, unknown> = {
          submission_number: submissionNumber,
          status: 'pending',
          household_number: submission.household_number,
          house_number: submission.house_number,
          street_purok: submission.street_purok,
          address: submission.address,
          barangay: submission.barangay || 'Sample Barangay',
          city: submission.city || 'Sample City',
          province: submission.province || 'Sample Province',
          district: submission.district,
          respondent_name: submission.respondent_name,
          respondent_relation: submission.respondent_relation,
          interview_date: submission.interview_date,
          years_staying: submission.years_staying,
          place_of_origin: submission.place_of_origin,
          ethnic_group: submission.ethnic_group,
          house_ownership: submission.house_ownership,
          lot_ownership: submission.lot_ownership,
          dwelling_type: submission.dwelling_type,
          lighting_source: submission.lighting_source,
          water_supply_level: submission.water_supply_level,
          water_storage: submission.water_storage,
          food_storage_type: submission.food_storage_type,
          toilet_facilities: submission.toilet_facilities,
          drainage_facilities: submission.drainage_facilities,
          garbage_disposal: submission.garbage_disposal,
          communication_services: submission.communication_services,
          means_of_transport: submission.means_of_transport,
          info_sources: submission.info_sources,
          is_4ps_beneficiary: submission.is_4ps_beneficiary,
          solo_parent_count: submission.solo_parent_count,
          pwd_count: submission.pwd_count,
          additional_notes: submission.additional_notes,
          household_members: submission.household_members || [],
        };

        // Use RPC for staff import
        const { error: insertError } = await supabase.rpc(
          "staff_import_ecological_submission",
          { p_data: insertData }
        );

        if (insertError) {
          console.error("Error inserting submission:", insertError);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} submissions`);
        if (staffUser) {
          createAuditLog({
            action: "import",
            entityType: "ecological_submission",
            entityId: "bulk",
            performedBy: staffUser.fullName,
            performedByType: "staff",
            details: { successCount, errorCount, format: "csv" }
          });
        }
        loadSubmissions();
      }
      
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} submissions`);
      }

      setShowImportDialog(false);
      setImportPreview([]);
      setImportErrors([]);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Failed to import submissions", { description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string, isDeleted: boolean = false) => {
    if (isDeleted) {
      return (
        <Badge variant="destructive" className="bg-gray-500">
          <Trash2 className="h-3 w-3 mr-1" />
          Deleted
        </Badge>
      );
    }
    
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      under_review: { variant: "default", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      approved: { variant: "outline", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const { variant, icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="capitalize">
        {icon}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const pendingCount = submissions.filter(s => s.status === "pending" && !s.deleted_at).length;

  return (
    <div className="space-y-6">
      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".csv"
        className="hidden"
      />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ecological Profile Submissions
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and approve resident-submitted ecological profile census data</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportSubmissions}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportMembers}>
                <Users className="h-4 w-4 mr-2" />
                Export Members
              </Button>
              <Button variant="outline" size="sm" onClick={loadSubmissions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by submission number, household, or respondent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="submission_number-asc">Submission # (A-Z)</SelectItem>
                <SelectItem value="submission_number-desc">Submission # (Z-A)</SelectItem>
                <SelectItem value="household_number-asc">Household # (A-Z)</SelectItem>
                <SelectItem value="household_number-desc">Household # (Z-A)</SelectItem>
                <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                <SelectItem value="status-desc">Status (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No submissions found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('submission_number')}
                    >
                      <div className="flex items-center gap-1">
                        Submission #
                        {getSortIcon('submission_number')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('household_number')}
                    >
                      <div className="flex items-center gap-1">
                        Household #
                        {getSortIcon('household_number')}
                      </div>
                    </TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Submitted
                        {getSortIcon('created_at')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubmissions.map((sub) => {
                    const isDeleted = sub.deleted_at !== null;
                    return (
                      <TableRow key={sub.id} className={isDeleted ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{sub.submission_number}</TableCell>
                        <TableCell>{sub.household_number || "—"}</TableCell>
                        <TableCell>{sub.respondent_name || "—"}</TableCell>
                        <TableCell>{format(new Date(sub.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell>{getStatusBadge(sub.status, isDeleted)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sub)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isDeleted ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleRecoverSubmission(sub)}
                                disabled={isProcessing}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Recover
                              </Button>
                            ) : (
                              <>
                                {sub.status === "pending" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => handleReview(sub, "approve")}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => handleReview(sub, "reject")}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteSubmission(sub)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Submission Details - {selectedSubmission?.submission_number}
            </DialogTitle>
            <DialogDescription>
              Review the ecological profile data submitted by the resident
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
                <TabsTrigger value="location" className="text-xs">Location</TabsTrigger>
                <TabsTrigger value="members" className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  Members
                  {selectedSubmission.household_members && (selectedSubmission.household_members as HouseholdMember[]).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {(selectedSubmission.household_members as HouseholdMember[]).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="housing" className="text-xs">Housing</TabsTrigger>
                <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
                <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
                <TabsTrigger value="additional" className="text-xs">Additional</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submission Number</Label>
                    <p className="font-medium">{selectedSubmission.submission_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Household Number</Label>
                    <p className="font-medium">{selectedSubmission.household_number || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Interview Date</Label>
                    <p className="font-medium">
                      {selectedSubmission.interview_date 
                        ? format(new Date(selectedSubmission.interview_date), "MMM dd, yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Respondent Name</Label>
                    <p className="font-medium">{selectedSubmission.respondent_name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Respondent Relation</Label>
                    <p className="font-medium">{selectedSubmission.respondent_relation || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Years Staying</Label>
                    <p className="font-medium">{selectedSubmission.years_staying ?? "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Place of Origin</Label>
                    <p className="font-medium">{selectedSubmission.place_of_origin || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Ethnic Group</Label>
                    <p className="font-medium">{selectedSubmission.ethnic_group || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submitted At</Label>
                    <p className="font-medium">{format(new Date(selectedSubmission.created_at), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                </div>

                {selectedSubmission.reviewed_by && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground text-xs font-semibold">Review Information</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-muted-foreground text-xs">Reviewed By</Label>
                        <p className="font-medium">{selectedSubmission.reviewed_by}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Reviewed At</Label>
                        <p className="font-medium">
                          {selectedSubmission.reviewed_at 
                            ? format(new Date(selectedSubmission.reviewed_at), "MMM dd, yyyy HH:mm")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    {selectedSubmission.rejection_reason && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground text-xs">Rejection Reason</Label>
                        <p className="font-medium text-destructive">{selectedSubmission.rejection_reason}</p>
                      </div>
                    )}
                    {selectedSubmission.staff_notes && (
                      <div className="mt-4">
                        <Label className="text-muted-foreground text-xs">Staff Notes</Label>
                        <p className="font-medium">{selectedSubmission.staff_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedSubmission.deleted_at && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground text-xs font-semibold text-destructive">Deletion Information</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label className="text-muted-foreground text-xs">Deleted By</Label>
                        <p className="font-medium text-destructive">{selectedSubmission.deleted_by || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Deleted At</Label>
                        <p className="font-medium text-destructive">
                          {format(new Date(selectedSubmission.deleted_at), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="location" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">House Number</Label>
                    <p className="font-medium">{selectedSubmission.house_number || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Street/Purok</Label>
                    <p className="font-medium">{selectedSubmission.street_purok || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Address</Label>
                    <p className="font-medium">{selectedSubmission.address || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">District</Label>
                    <p className="font-medium">{selectedSubmission.district || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Barangay</Label>
                    <p className="font-medium">{selectedSubmission.barangay || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">City/Municipality</Label>
                    <p className="font-medium">{selectedSubmission.city || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Province</Label>
                    <p className="font-medium">{selectedSubmission.province || "—"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="members" className="space-y-4 mt-4">
                {(() => {
                  const members = selectedSubmission.household_members as HouseholdMember[] | null;
                  if (!members || members.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No household members in this submission</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {members.length} member{members.length !== 1 ? 's' : ''} will be {selectedSubmission.status === 'pending' ? 'created/updated' : 'processed'} when approved
                        </p>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Relation</TableHead>
                              <TableHead>Birth Date</TableHead>
                              <TableHead>Gender</TableHead>
                              <TableHead>Employment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.map((member, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {member.full_name || "—"}
                                    {(member.is_head_of_household || getMemberValue(member, 'relation_to_head', 'relationship_to_head') === 'Head') && (
                                      <Badge variant="outline" className="text-xs">Head</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{getMemberValue(member, 'relation_to_head', 'relationship_to_head') || "—"}</TableCell>
                                <TableCell>
                                  {member.birth_date 
                                    ? format(new Date(member.birth_date), "MMM dd, yyyy")
                                    : member.age 
                                      ? `${member.age} yrs old`
                                      : "—"}
                                </TableCell>
                                <TableCell className="capitalize">{member.gender || "—"}</TableCell>
                                <TableCell className="capitalize">
                                  {getMemberValue(member, 'employment_status')?.replace(/_/g, ' ') || "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      
                      {/* Detailed member cards */}
                      <div className="pt-4 border-t space-y-3">
                        <Label className="text-muted-foreground">Member Details</Label>
                        {members.map((member, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-medium">{member.full_name || `Member ${idx + 1}`}</span>
                              {(member.is_head_of_household || getMemberValue(member, 'relation_to_head', 'relationship_to_head') === 'Head') && (
                                <Badge variant="default" className="text-xs">Household Head</Badge>
                              )}
                              {member.is_pwd && (
                                <Badge variant="secondary" className="text-xs">PWD</Badge>
                              )}
                              {member.is_solo_parent && (
                                <Badge variant="secondary" className="text-xs">Solo Parent</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Relation: </span>
                                {getMemberValue(member, 'relation_to_head', 'relationship_to_head') || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Age: </span>
                                {member.age ?? (member.birth_date ? `${new Date().getFullYear() - new Date(member.birth_date).getFullYear()}` : "—")}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Gender: </span>
                                <span className="capitalize">{member.gender || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Civil Status: </span>
                                <span className="capitalize">{member.civil_status || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Religion: </span>
                                {member.religion || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Education: </span>
                                {getMemberValue(member, 'education_attainment', 'education_level') || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Schooling: </span>
                                {member.schooling_status || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Employment: </span>
                                <span className="capitalize">{getMemberValue(member, 'employment_status')?.replace(/_/g, ' ') || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Occupation: </span>
                                {member.occupation || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Contact: </span>
                                {member.contact_number || "—"}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Income: </span>
                                {getMemberValue(member, 'monthly_income_cash', 'monthly_income') || "—"}
                              </div>
                              {member.monthly_income_kind && (
                                <div>
                                  <span className="text-muted-foreground">Income (Kind): </span>
                                  {member.monthly_income_kind}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="housing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">House Ownership</Label>
                    <p className="font-medium">{selectedSubmission.house_ownership || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Lot Ownership</Label>
                    <p className="font-medium">{selectedSubmission.lot_ownership || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Dwelling Type</Label>
                    <p className="font-medium">{selectedSubmission.dwelling_type || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Lighting Source</Label>
                    <p className="font-medium">{selectedSubmission.lighting_source || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Water Supply</Label>
                    <p className="font-medium">{selectedSubmission.water_supply_level || "—"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Water Storage</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.water_storage) && selectedSubmission.water_storage.length 
                        ? selectedSubmission.water_storage.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Food Storage</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.food_storage_type) && selectedSubmission.food_storage_type.length 
                        ? selectedSubmission.food_storage_type.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Toilet Facilities</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.toilet_facilities) && selectedSubmission.toilet_facilities.length 
                        ? selectedSubmission.toilet_facilities.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Drainage Facilities</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.drainage_facilities) && selectedSubmission.drainage_facilities.length 
                        ? selectedSubmission.drainage_facilities.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Garbage Disposal</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.garbage_disposal) && selectedSubmission.garbage_disposal.length 
                        ? selectedSubmission.garbage_disposal.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Communication Services</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.communication_services) && selectedSubmission.communication_services.length 
                        ? selectedSubmission.communication_services.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Means of Transport</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.means_of_transport) && selectedSubmission.means_of_transport.length 
                        ? selectedSubmission.means_of_transport.join(", ") 
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Information Sources</Label>
                    <p className="font-medium">
                      {Array.isArray(selectedSubmission.info_sources) && selectedSubmission.info_sources.length 
                        ? selectedSubmission.info_sources.join(", ") 
                        : "—"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4 mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  {(() => {
                    const healthData = selectedSubmission.health_data as Record<string, unknown> | null;
                    const hasHealthData = healthData && Object.keys(healthData).length > 0;
                    
                    // Helper to render data section
                    const renderDataSection = (title: string, data: Record<string, unknown> | null) => {
                      if (!data || Object.keys(data).length === 0) return null;
                      
                      return (
                        <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
                          <Label className="text-xs font-semibold text-primary">{title}</Label>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(data).map(([key, value]) => {
                              // Format the key to be more readable
                              const formattedKey = key
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/_/g, ' ')
                                .replace(/^\w/, c => c.toUpperCase())
                                .trim();
                              
                              // Handle nested objects
                              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                return (
                                  <div key={key} className="col-span-2 md:col-span-3">
                                    <span className="text-muted-foreground text-xs block mb-1">{formattedKey}:</span>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 pl-2 border-l-2 border-muted">
                                      {Object.entries(value as Record<string, unknown>).map(([subKey, subValue]) => (
                                        <div key={subKey} className="text-xs">
                                          <span className="text-muted-foreground capitalize">{subKey.replace(/_/g, ' ')}: </span>
                                          <span className="font-medium">{String(subValue)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={key} className="text-sm">
                                  <span className="text-muted-foreground text-xs block">{formattedKey}</span>
                                  <span className="font-medium">
                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? '—')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    const hasAnyData = hasHealthData ||
                      (selectedSubmission.immunization_data && Object.keys(selectedSubmission.immunization_data).length > 0) ||
                      (selectedSubmission.education_data && Object.keys(selectedSubmission.education_data).length > 0) ||
                      (selectedSubmission.family_planning && Object.keys(selectedSubmission.family_planning).length > 0) ||
                      (selectedSubmission.pregnant_data && Object.keys(selectedSubmission.pregnant_data).length > 0) ||
                      (selectedSubmission.disability_data && Object.keys(selectedSubmission.disability_data).length > 0) ||
                      (selectedSubmission.senior_data && Object.keys(selectedSubmission.senior_data).length > 0) ||
                      (selectedSubmission.death_data && Object.keys(selectedSubmission.death_data).length > 0);

                    if (!hasAnyData) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No health-related data in this submission</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {renderDataSection('Health Statistics', healthData)}
                        {renderDataSection('Immunization Records', selectedSubmission.immunization_data)}
                        {renderDataSection('Education Data', selectedSubmission.education_data)}
                        {renderDataSection('Family Planning', selectedSubmission.family_planning)}
                        {renderDataSection('Pregnancy Data', selectedSubmission.pregnant_data)}
                        {renderDataSection('Disability Information', selectedSubmission.disability_data)}
                        {renderDataSection('Senior Citizens', selectedSubmission.senior_data)}
                        {renderDataSection('Death Records', selectedSubmission.death_data)}
                      </div>
                    );
                  })()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">4Ps Beneficiary</Label>
                    <p className="font-medium">{selectedSubmission.is_4ps_beneficiary ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Solo Parent Count</Label>
                    <p className="font-medium">{selectedSubmission.solo_parent_count ?? 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">PWD Count</Label>
                    <p className="font-medium">{selectedSubmission.pwd_count ?? 0}</p>
                  </div>
                </div>

                {/* Food Production */}
                {selectedSubmission.food_production && Object.keys(selectedSubmission.food_production).length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground text-xs font-semibold">Food Production</Label>
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                      <pre className="text-xs whitespace-pre-wrap overflow-auto">
                        {JSON.stringify(selectedSubmission.food_production, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Animals */}
                {selectedSubmission.animals && Object.keys(selectedSubmission.animals).length > 0 && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground text-xs font-semibold">Animals/Livestock</Label>
                    <div className="mt-2 p-3 rounded-lg bg-muted/50 border">
                      <pre className="text-xs whitespace-pre-wrap overflow-auto">
                        {JSON.stringify(selectedSubmission.animals, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedSubmission.additional_notes && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground text-xs">Additional Notes</Label>
                    <p className="font-medium mt-1">{selectedSubmission.additional_notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedSubmission?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleReview(selectedSubmission, "reject");
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleReview(selectedSubmission, "approve");
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Submission
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "This will approve the submission and update the household records."
                : "Please provide a reason for rejecting this submission."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm"><strong>Submission:</strong> {selectedSubmission?.submission_number}</p>
              <p className="text-sm"><strong>Household:</strong> {selectedSubmission?.household_number || "New Household"}</p>
              <p className="text-sm"><strong>Respondent:</strong> {selectedSubmission?.respondent_name}</p>
            </div>

            {reviewAction === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this submission is being rejected..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Staff Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={staffNotes}
                onChange={(e) => setStaffNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={processReview}
              disabled={isProcessing}
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : reviewAction === "approve" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this ecological profile submission? This action can be undone by recovering the submission later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {submissionToDelete && (
            <div className="p-3 rounded-lg bg-muted my-4">
              <p className="text-sm"><strong>Submission:</strong> {submissionToDelete.submission_number}</p>
              <p className="text-sm"><strong>Household:</strong> {submissionToDelete.household_number || "—"}</p>
              <p className="text-sm"><strong>Respondent:</strong> {submissionToDelete.respondent_name || "—"}</p>
              <p className="text-sm"><strong>Submitted:</strong> {format(new Date(submissionToDelete.created_at), "MMM dd, yyyy HH:mm")}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={processDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EcologicalSubmissionsTab;

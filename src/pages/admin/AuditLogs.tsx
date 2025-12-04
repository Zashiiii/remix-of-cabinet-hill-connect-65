import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, Search, Filter, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  performedBy: string;
  performedByType: string;
  details?: Record<string, any>;
  createdAt: string;
}

const ACTION_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  approve: "outline",
  reject: "destructive",
  login: "secondary",
  logout: "secondary",
};

const AdminAuditLogs = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access this page");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      if (actionFilter !== "all") {
        query = query.ilike("action", `%${actionFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setLogs(data.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id || undefined,
          performedBy: log.performed_by,
          performedByType: log.performed_by_type,
          details: log.details as Record<string, any> | undefined,
          createdAt: new Date(log.created_at || "").toLocaleString(),
        })));
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actionFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs();
    }
  }, [isAuthenticated, loadLogs]);

  const filteredLogs = logs.filter(log =>
    log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.entityId && log.entityId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getActionBadge = (action: string) => {
    const variant = ACTION_COLORS[action.toLowerCase()] || "secondary";
    return <Badge variant={variant} className="capitalize">{action}</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-6 px-4">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/staff-dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <History className="h-6 w-6" />
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  Track all system activities and changes
                </CardDescription>
              </div>
              <Button variant="outline" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="certificate_request">Certificate Requests</SelectItem>
                  <SelectItem value="resident">Residents</SelectItem>
                  <SelectItem value="incident">Incidents</SelectItem>
                  <SelectItem value="announcement">Announcements</SelectItem>
                  <SelectItem value="staff_user">Staff Users</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">No Audit Logs</h3>
                <p className="text-muted-foreground">
                  {searchQuery || entityFilter !== "all" || actionFilter !== "all"
                    ? "No logs match your search criteria."
                    : "No activity has been recorded yet."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {log.createdAt}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium capitalize">
                              {log.entityType.replace(/_/g, " ")}
                            </span>
                            {log.entityId && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {log.entityId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{log.performedBy}</span>
                            <p className="text-xs text-muted-foreground capitalize">
                              {log.performedByType}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.details && (
                            <pre className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuditLogs;

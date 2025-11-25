import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  residentName: string;
  certificateType: string;
  dateSubmitted: string;
  status: "pending" | "processing" | "approved" | "rejected";
  verificationStatus?: "verified" | "not-verified" | "checking";
  processedBy?: string;
  processedDate?: string;
  notes?: string;
}

const mockPendingRequests: PendingRequest[] = [
  {
    id: "BR-004",
    residentName: "Ana Garcia",
    certificateType: "Certificate of Residency",
    dateSubmitted: "2024-11-12",
    status: "pending",
    verificationStatus: "verified",
  },
  {
    id: "BR-012",
    residentName: "Carmen Rivera",
    certificateType: "Certificate of Residency",
    dateSubmitted: "2024-11-08",
    status: "pending",
    verificationStatus: "verified",
  },
  {
    id: "BR-005",
    residentName: "Carlos Torres",
    certificateType: "Barangay Clearance",
    dateSubmitted: "2024-11-12",
    status: "processing",
    verificationStatus: "verified",
  },
  {
    id: "BR-011",
    residentName: "Diego Lopez",
    certificateType: "Certificate of Indigency",
    dateSubmitted: "2024-11-09",
    status: "processing",
    verificationStatus: "verified",
  },
  {
    id: "BR-006",
    residentName: "Elena Cruz",
    certificateType: "Certificate of Good Moral Character",
    dateSubmitted: "2024-11-11",
    status: "pending",
    verificationStatus: "not-verified",
  },
  {
    id: "BR-010",
    residentName: "Isabel Martinez",
    certificateType: "Barangay Clearance",
    dateSubmitted: "2024-11-09",
    status: "pending",
    verificationStatus: "checking",
  },
  {
    id: "BR-001",
    residentName: "Juan Dela Cruz",
    certificateType: "Barangay Clearance",
    dateSubmitted: "2024-11-15",
    status: "pending",
    verificationStatus: "verified",
  },
  {
    id: "BR-002",
    residentName: "Maria Santos",
    certificateType: "Certificate of Indigency",
    dateSubmitted: "2024-11-14",
    status: "processing",
    verificationStatus: "verified",
  },
  {
    id: "BR-009",
    residentName: "Miguel Santos",
    certificateType: "Certificate for Senior Citizen/PWD ID",
    dateSubmitted: "2024-11-10",
    status: "pending",
    verificationStatus: "verified",
  },
  {
    id: "BR-003",
    residentName: "Pedro Reyes",
    certificateType: "Business Permit",
    dateSubmitted: "2024-11-13",
    status: "pending",
    verificationStatus: "checking",
  },
  {
    id: "BR-007",
    residentName: "Roberto Fernandez",
    certificateType: "Business Permit Clearance",
    dateSubmitted: "2024-11-11",
    status: "pending",
    verificationStatus: "verified",
  },
  {
    id: "BR-008",
    residentName: "Sofia Ramos",
    certificateType: "First Time Job Seeker Certificate",
    dateSubmitted: "2024-11-10",
    status: "processing",
    verificationStatus: "verified",
  },
];

const StaffSidebar = () => {
  const navigate = useNavigate();
  const { state } = useSidebar();

  const menuItems = [
    { title: "Home", icon: Home, path: "/" },
    { title: "Manage Residents", icon: Users, path: "manage-residents" },
    { title: "Certificate Requests", icon: FileText, path: "certificate-requests" },
    { title: "View Reports", icon: BarChart3, path: "view-reports" },
  ];

  const handleLogout = () => {
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleNavigation = (path: string) => {
    if (path === "/") {
      navigate("/");
    } else {
      toast.info(`${path.replace("-", " ")} feature coming in Phase 2`);
    }
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg text-primary ${isCollapsed ? "hidden" : "block"}`}>
            Staff Portal
          </h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "hidden" : "block"}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.path)}
                    className="hover:bg-muted/50"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="hover:bg-destructive/10 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [requests, setRequests] = useState<PendingRequest[]>(mockPendingRequests);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);

  const handleAction = (action: string, request: PendingRequest) => {
    const timestamp = new Date().toLocaleString();
    
    if (action === "Approve") {
      setRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { 
              ...r, 
              status: "approved", 
              processedBy: "Staff Admin",
              processedDate: timestamp,
              notes: "Approved - All requirements verified"
            } 
          : r
      ));
      toast.success(`Request ${request.id} approved successfully`, {
        description: `Certificate for ${request.residentName} has been approved.`
      });
    } else if (action === "Reject") {
      setRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { 
              ...r, 
              status: "rejected", 
              processedBy: "Staff Admin",
              processedDate: timestamp,
              notes: "Rejected - Incomplete requirements"
            } 
          : r
      ));
      toast.error(`Request ${request.id} rejected`, {
        description: `Certificate request for ${request.residentName} has been rejected.`
      });
    } else if (action === "View") {
      setSelectedRequest(request);
      toast.info(`Viewing details for request ${request.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      approved: "outline",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StaffSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-foreground">Staff Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">Staff Admin</span>
                <span className="text-xs text-muted-foreground">
                  {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success("Logged out successfully");
                  navigate("/");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,344</div>
                  <p className="text-xs text-muted-foreground">Registered residents</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Awaiting processing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">Certificates issued</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-xs text-muted-foreground">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/request-certificate")}>
                  <FileText className="h-4 w-4 mr-2" />
                  New Certificate Request
                </Button>
                <Button variant="outline" onClick={() => toast.info("Feature coming in Phase 2")}>
                  <Users className="h-4 w-4 mr-2" />
                  Register Resident
                </Button>
                <Button variant="outline" onClick={() => toast.info("Feature coming in Phase 2")}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Pending Requests Table */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Certificate Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Resident Name</TableHead>
                      <TableHead>Certificate Type</TableHead>
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.id}</TableCell>
                        <TableCell>{request.residentName}</TableCell>
                        <TableCell>{request.certificateType}</TableCell>
                        <TableCell>{request.dateSubmitted}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(request.status)}
                            {request.processedBy && (
                              <div className="text-xs text-muted-foreground">
                                By: {request.processedBy}
                                <br />
                                {request.processedDate}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.verificationStatus === "verified" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              ✓ Verified
                            </Badge>
                          )}
                          {request.verificationStatus === "not-verified" && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              ✗ Not Verified
                            </Badge>
                          )}
                          {request.verificationStatus === "checking" && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Checking...
                            </Badge>
                          )}
                          {!request.verificationStatus && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction("View", request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction("Approve", request)}
                              className="hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction("Reject", request)}
                              className="hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Selected Request Details */}
                {selectedRequest && selectedRequest.notes && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                    <h3 className="font-semibold mb-2">Notes for {selectedRequest.id}</h3>
                    <p className="text-sm text-muted-foreground">{selectedRequest.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StaffDashboard;

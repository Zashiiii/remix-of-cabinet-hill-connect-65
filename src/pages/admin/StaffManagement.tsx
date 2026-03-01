import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Edit, Trash2, Loader2, Save, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { 
  getStaffUsers, 
  createStaffUser, 
  updateStaffUser, 
  deleteStaffUser, 
  toggleStaffUserActive 
} from "@/utils/staffApi";

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Only barangay official positions - no generic "staff" role
const ROLES = [
  { value: "admin", label: "System Administrator", description: "Full system access and staff management" },
  { value: "barangay_captain", label: "Barangay Captain", description: "Head of barangay with full privileges" },
  { value: "barangay_official", label: "Barangay Kagawad", description: "Elected barangay council member" },
  { value: "secretary", label: "Barangay Secretary", description: "Handles documentation and records" },
  
  { value: "sk_chairman", label: "SK Chairman", description: "Head of Sangguniang Kabataan" },
];

const AdminStaffManagement = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuth();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "secretary",
    isActive: true,
  });

  // Filtered staff users based on role filter
  const filteredStaffUsers = roleFilter === "all" 
    ? staffUsers 
    : staffUsers.filter(u => u.role === roleFilter);

  // Auth is now handled by ProtectedRoute wrapper

  const loadStaffUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getStaffUsers();
      setStaffUsers(data.map((u: any) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        role: u.role || "staff",
        isActive: u.is_active ?? true,
        createdAt: new Date(u.created_at || "").toLocaleDateString(),
      })));
    } catch (error: any) {
      console.error("Error loading staff users:", error);
      toast.error(error.message || "Failed to load staff users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadStaffUsers();
    }
  }, [isAuthenticated, loadStaffUsers]);

  const handleEdit = (staffUser: StaffUser | null) => {
    if (staffUser) {
      setFormData({
        username: staffUser.username,
        fullName: staffUser.fullName,
        password: "",
        role: staffUser.role,
        isActive: staffUser.isActive,
      });
      setSelectedUser(staffUser);
    } else {
      setFormData({
        username: "",
        fullName: "",
        password: "",
        role: "secretary",
        isActive: true,
      });
      setSelectedUser(null);
    }
    setShowEditDialog(true);
  };

  const hashPassword = async (password: string): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Use fetch with credentials: 'include' to send httpOnly cookies
    const response = await fetch(`${supabaseUrl}/functions/v1/staff-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      credentials: 'include', // Important: sends httpOnly cookies for authentication
      body: JSON.stringify({ action: "hash-password", password }),
    });

    const data = await response.json();
    
    if (!response.ok || !data?.hashedPassword) {
      throw new Error(data?.error || "Failed to hash password");
    }
    
    return data.hashedPassword;
  };

  const handleSave = async () => {
    if (!formData.username || !formData.fullName) {
      toast.error("Please fill in username and full name");
      return;
    }

    if (!selectedUser && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }

    setIsSaving(true);
    try {
      if (selectedUser) {
        // Update existing user
        const updates: {
          username?: string;
          fullName?: string;
          passwordHash?: string;
          role?: string;
          isActive?: boolean;
        } = {
          username: formData.username,
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
        };

        if (formData.password) {
          // Hash password via edge function
          updates.passwordHash = await hashPassword(formData.password);
        }

        await updateStaffUser(selectedUser.id, updates);
        toast.success("Staff user updated successfully");
      } else {
        // Create new user - hash password via edge function
        const hashedPassword = await hashPassword(formData.password);
        
        await createStaffUser({
          username: formData.username,
          fullName: formData.fullName,
          passwordHash: hashedPassword,
          role: formData.role,
          isActive: formData.isActive,
        });
        toast.success("Staff user created successfully");
      }

      setShowEditDialog(false);
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error saving staff user:", error);
      if (error.message?.includes("duplicate") || error.message?.includes("already exists")) {
        toast.error("Username already exists");
      } else {
        toast.error(error.message || "Failed to save staff user");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (staffUser: StaffUser) => {
    try {
      await toggleStaffUserActive(staffUser.id);
      toast.success(`User ${staffUser.isActive ? "deactivated" : "activated"}`);
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  const handleDelete = async (staffUser: StaffUser) => {
    if (!confirm(`Are you sure you want to delete ${staffUser.fullName}?`)) return;

    try {
      await deleteStaffUser(staffUser.id);
      toast.success("Staff user deleted");
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error deleting staff user:", error);
      toast.error(error.message || "Failed to delete staff user");
    }
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
                  <Users className="h-6 w-6" />
                  Staff Management
                </CardTitle>
                <CardDescription>
                  Manage staff accounts and permissions
                </CardDescription>
              </div>
              <Button onClick={() => handleEdit(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff User
              </Button>
            </div>
            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Filter by role:</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredStaffUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">
                  {roleFilter === "all" ? "No Staff Users" : `No ${ROLES.find(r => r.value === roleFilter)?.label || roleFilter} Users`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {roleFilter === "all" ? "Create your first staff account." : "No users found with this role."}
                </p>
                {roleFilter === "all" && (
                  <Button onClick={() => handleEdit(null)}>Add Staff User</Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaffUsers.map((staffUser) => (
                      <TableRow key={staffUser.id}>
                        <TableCell className="font-medium">{staffUser.username}</TableCell>
                        <TableCell>{staffUser.fullName}</TableCell>
                        <TableCell>
                          <Badge variant={staffUser.role === "admin" || staffUser.role === "barangay_captain" ? "default" : "secondary"}>
                            {(staffUser.role === "admin" || staffUser.role === "barangay_captain" || staffUser.role === "barangay_official" || staffUser.role === "sk_chairman") && <Shield className="h-3 w-3 mr-1" />}
                            {ROLES.find(r => r.value === staffUser.role)?.label || staffUser.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={staffUser.isActive ? "outline" : "destructive"}>
                            {staffUser.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{staffUser.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(staffUser)}
                            >
                              {staffUser.isActive ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(staffUser)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(staffUser)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Edit Staff User" : "Add Staff User"}</DialogTitle>
              <DialogDescription>
                {selectedUser ? "Update staff account details" : "Create a new staff account"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {selectedUser ? "(leave blank to keep current)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={selectedUser ? "Enter new password" : "Enter password"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex flex-col">
                          <span>{r.label}</span>
                          <span className="text-xs text-muted-foreground">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only official barangay positions can be assigned.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminStaffManagement;

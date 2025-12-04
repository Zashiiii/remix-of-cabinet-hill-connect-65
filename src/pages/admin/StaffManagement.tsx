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
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StaffUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

const AdminStaffManagement = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "staff",
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access this page");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadStaffUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setStaffUsers(data.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          role: u.role || "staff",
          isActive: u.is_active ?? true,
          createdAt: new Date(u.created_at || "").toLocaleDateString(),
        })));
      }
    } catch (error) {
      console.error("Error loading staff users:", error);
      toast.error("Failed to load staff users");
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
        role: "staff",
        isActive: true,
      });
      setSelectedUser(null);
    }
    setShowEditDialog(true);
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
        const updateData: any = {
          username: formData.username,
          full_name: formData.fullName,
          role: formData.role,
          is_active: formData.isActive,
          updated_at: new Date().toISOString(),
        };

        if (formData.password) {
          updateData.password_hash = formData.password; // In production, hash this!
        }

        const { error } = await supabase
          .from("staff_users")
          .update(updateData)
          .eq("id", selectedUser.id);

        if (error) throw error;
        toast.success("Staff user updated successfully");
      } else {
        const { error } = await supabase
          .from("staff_users")
          .insert({
            username: formData.username,
            full_name: formData.fullName,
            password_hash: formData.password, // In production, hash this!
            role: formData.role,
            is_active: formData.isActive,
          });

        if (error) throw error;
        toast.success("Staff user created successfully");
      }

      setShowEditDialog(false);
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error saving staff user:", error);
      if (error.message?.includes("duplicate")) {
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
      const { error } = await supabase
        .from("staff_users")
        .update({ is_active: !staffUser.isActive })
        .eq("id", staffUser.id);

      if (error) throw error;
      toast.success(`User ${staffUser.isActive ? "deactivated" : "activated"}`);
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDelete = async (staffUser: StaffUser) => {
    if (!confirm(`Are you sure you want to delete ${staffUser.fullName}?`)) return;

    try {
      const { error } = await supabase
        .from("staff_users")
        .delete()
        .eq("id", staffUser.id);

      if (error) throw error;
      toast.success("Staff user deleted");
      loadStaffUsers();
    } catch (error: any) {
      console.error("Error deleting staff user:", error);
      toast.error("Failed to delete staff user");
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : staffUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">No Staff Users</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first staff account.
                </p>
                <Button onClick={() => handleEdit(null)}>Add Staff User</Button>
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
                    {staffUsers.map((staffUser) => (
                      <TableRow key={staffUser.id}>
                        <TableCell className="font-medium">{staffUser.username}</TableCell>
                        <TableCell>{staffUser.fullName}</TableCell>
                        <TableCell>
                          <Badge variant={staffUser.role === "admin" ? "default" : "secondary"}>
                            {staffUser.role === "admin" && <Shield className="h-3 w-3 mr-1" />}
                            {staffUser.role}
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
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

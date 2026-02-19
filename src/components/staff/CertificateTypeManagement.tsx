import { useState, useEffect } from "react";
import { FileText, Plus, Pencil, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

interface CertificateType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const callStaffApi = async (action: string, body: Record<string, unknown> = {}): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/staff-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    credentials: 'include',
    body: JSON.stringify({ action, ...body }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const CertificateTypeManagement = () => {
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingType, setEditingType] = useState<CertificateType | null>(null);
  const [editName, setEditName] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const result = await callStaffApi('get-certificate-types');
      setTypes(result.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load certificate types");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a certificate type name");
      return;
    }
    setIsSaving(true);
    try {
      await callStaffApi('create-certificate-type', { name: newName.trim() });
      toast.success("Certificate type added");
      setNewName("");
      setAddDialogOpen(false);
      fetchTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to add certificate type");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingType || !editName.trim()) {
      toast.error("Please enter a certificate type name");
      return;
    }
    setIsSaving(true);
    try {
      await callStaffApi('update-certificate-type', { id: editingType.id, name: editName.trim() });
      toast.success("Certificate type updated");
      setEditingType(null);
      setEditName("");
      setEditDialogOpen(false);
      fetchTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to update certificate type");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (type: CertificateType) => {
    try {
      await callStaffApi('toggle-certificate-type', { id: type.id });
      toast.success(`Certificate type ${type.is_active ? 'disabled' : 'enabled'}`);
      fetchTypes();
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle certificate type");
    }
  };

  const openEdit = (type: CertificateType) => {
    setEditingType(type);
    setEditName(type.name);
    setEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Certificate Type Management
            </CardTitle>
            <CardDescription>Manage available certificate types for requests</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Certificate Type</DialogTitle>
                <DialogDescription>Enter the name of the new certificate type.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="newTypeName">Certificate Type Name</Label>
                <Input
                  id="newTypeName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Certificate of Good Standing"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No certificate types found.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(type.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(type)}
                          title="Edit name"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(type)}
                          title={type.is_active ? "Disable" : "Enable"}
                        >
                          {type.is_active ? (
                            <ToggleRight className="h-4 w-4 text-primary" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* "Others (Specify)" note */}
        <p className="text-xs text-muted-foreground mt-3">
          Note: "Others (Specify)" is always available as a default option in the certificate request form.
        </p>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Certificate Type</DialogTitle>
              <DialogDescription>Update the name of this certificate type.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="editTypeName">Certificate Type Name</Label>
              <Input
                id="editTypeName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEdit} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CertificateTypeManagement;

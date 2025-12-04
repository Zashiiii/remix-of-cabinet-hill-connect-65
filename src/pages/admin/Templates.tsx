import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Edit, Trash2, Loader2, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useStaffAuthContext } from "@/context/StaffAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  name: string;
  certificateType: string;
  templateContent: string;
  placeholders: string[];
  isActive: boolean;
  createdAt: string;
}

const CERTIFICATE_TYPES = [
  { value: "barangay-clearance", label: "Barangay Clearance" },
  { value: "certificate-of-indigency", label: "Certificate of Indigency" },
  { value: "certificate-of-residency", label: "Certificate of Residency" },
  { value: "business-permit", label: "Business Permit" },
  { value: "certificate-of-good-moral", label: "Certificate of Good Moral Character" },
];

const AVAILABLE_PLACEHOLDERS = [
  { key: "full_name", description: "Resident's full name" },
  { key: "address", description: "Complete address" },
  { key: "civil_status", description: "Civil status (Single, Married, etc.)" },
  { key: "age", description: "Age in years" },
  { key: "birth_date", description: "Date of birth" },
  { key: "purpose", description: "Purpose of the certificate" },
  { key: "date_issued", description: "Date of issuance" },
  { key: "control_number", description: "Control/Reference number" },
  { key: "barangay_name", description: "Barangay name" },
  { key: "city", description: "City/Municipality" },
  { key: "province", description: "Province" },
  { key: "punong_barangay", description: "Punong Barangay name" },
  { key: "years_of_residency", description: "Years of residency" },
];

const AdminTemplates = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuthContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    certificateType: "",
    templateContent: "",
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please login to access this page");
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setTemplates(data.map(t => ({
          id: t.id,
          name: t.name,
          certificateType: t.certificate_type,
          templateContent: t.template_content,
          placeholders: Array.isArray(t.placeholders) 
            ? (t.placeholders as unknown as string[]) 
            : [],
          isActive: t.is_active ?? true,
          createdAt: new Date(t.created_at || "").toLocaleDateString(),
        })));
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTemplates();
    }
  }, [isAuthenticated, loadTemplates]);

  const handleEdit = (template: Template | null) => {
    if (template) {
      setFormData({
        name: template.name,
        certificateType: template.certificateType,
        templateContent: template.templateContent,
        isActive: template.isActive,
      });
      setSelectedTemplate(template);
    } else {
      setFormData({
        name: "",
        certificateType: "",
        templateContent: "",
        isActive: true,
      });
      setSelectedTemplate(null);
    }
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.certificateType || !formData.templateContent) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const templateData = {
        name: formData.name,
        certificate_type: formData.certificateType,
        template_content: formData.templateContent,
        is_active: formData.isActive,
        updated_at: new Date().toISOString(),
      };

      if (selectedTemplate) {
        const { error } = await supabase
          .from("certificate_templates")
          .update(templateData)
          .eq("id", selectedTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("certificate_templates")
          .insert({
            ...templateData,
            created_by: user?.fullName,
          });

        if (error) throw error;
        toast.success("Template created successfully");
      }

      setShowEditDialog(false);
      loadTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("certificate_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Template deleted");
      loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData(prev => ({
      ...prev,
      templateContent: prev.templateContent + `{{${placeholder}}}`,
    }));
  };

  const renderPreview = (content: string) => {
    let preview = content;
    AVAILABLE_PLACEHOLDERS.forEach(p => {
      preview = preview.replace(
        new RegExp(`{{${p.key}}}`, "g"),
        `<span class="bg-primary/20 px-1 rounded">[${p.description}]</span>`
      );
    });
    return preview;
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
                  <FileText className="h-6 w-6" />
                  Certificate Template Editor
                </CardTitle>
                <CardDescription>
                  Manage and customize certificate templates
                </CardDescription>
              </div>
              <Button onClick={() => handleEdit(null)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium text-lg mb-2">No Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first certificate template.
                </p>
                <Button onClick={() => handleEdit(null)}>Create Template</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant={template.isActive ? "default" : "secondary"} className="mt-1">
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Type: {CERTIFICATE_TYPES.find(t => t.value === template.certificateType)?.label || template.certificateType}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              <DialogDescription>
                Design your certificate template with placeholders
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="editor" className="mt-4">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Barangay Clearance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Certificate Type *</Label>
                    <Select
                      value={formData.certificateType}
                      onValueChange={(v) => setFormData({ ...formData, certificateType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Template Content (HTML) *</Label>
                  <Textarea
                    id="content"
                    value={formData.templateContent}
                    onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
                    placeholder="Enter HTML template with {{placeholders}}"
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg p-6 bg-white min-h-[400px]">
                  <div
                    dangerouslySetInnerHTML={{ __html: renderPreview(formData.templateContent) }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="placeholders" className="mt-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click on a placeholder to insert it into your template. Use the format: {"{{placeholder_name}}"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_PLACEHOLDERS.map((p) => (
                      <Button
                        key={p.key}
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => insertPlaceholder(p.key)}
                      >
                        <code className="text-xs mr-2">{`{{${p.key}}}`}</code>
                        <span className="text-xs text-muted-foreground truncate">{p.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg p-6 bg-white">
              <div
                dangerouslySetInnerHTML={{ 
                  __html: renderPreview(selectedTemplate?.templateContent || "") 
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminTemplates;

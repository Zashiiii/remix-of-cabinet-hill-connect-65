import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { 
  ArrowLeft, 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2,
  User,
  Calendar,
  Phone,
  MapPin,
  Mail,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PendingResident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  birth_date: string | null;
  contact_number: string | null;
  place_of_origin: string | null;
  approval_status: string;
  created_at: string;
}

const ResidentApproval = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useStaffAuth();
  const [pendingResidents, setPendingResidents] = useState<PendingResident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<PendingResident | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingRegistrations();
    }
  }, [isAuthenticated]);

  const loadPendingRegistrations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_registrations');
      
      if (error) {
        console.error('Error loading pending registrations:', error);
        toast.error("Failed to load pending registrations");
        return;
      }

      setPendingResidents(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while loading registrations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (resident: PendingResident) => {
    setProcessingId(resident.id);
    try {
      const { error } = await supabase.rpc('staff_approve_resident', {
        p_resident_id: resident.id,
        p_approved_by: user?.fullName || 'Admin',
      });

      if (error) {
        console.error('Error approving resident:', error);
        toast.error("Failed to approve registration");
        return;
      }

      toast.success(`${resident.first_name} ${resident.last_name}'s registration has been approved`);
      loadPendingRegistrations();
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while approving registration");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (resident: PendingResident) => {
    setSelectedResident(resident);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedResident) return;
    
    setProcessingId(selectedResident.id);
    try {
      const { error } = await supabase.rpc('staff_reject_resident', {
        p_resident_id: selectedResident.id,
        p_rejected_by: user?.fullName || 'Admin',
        p_rejection_reason: rejectionReason || 'Registration rejected',
      });

      if (error) {
        console.error('Error rejecting resident:', error);
        toast.error("Failed to reject registration");
        return;
      }

      toast.success(`${selectedResident.first_name} ${selectedResident.last_name}'s registration has been rejected`);
      setRejectDialogOpen(false);
      loadPendingRegistrations();
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred while rejecting registration");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredResidents = pendingResidents.filter(resident => {
    const fullName = `${resident.first_name} ${resident.middle_name || ''} ${resident.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           resident.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/staff-dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Resident Registration Approval</CardTitle>
            <CardDescription>
              Review and approve or reject pending resident registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Pending Count */}
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                {filteredResidents.length} pending registration{filteredResidents.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* List */}
            {filteredResidents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending registrations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResidents.map((resident) => (
                  <Card key={resident.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">
                              {resident.first_name} {resident.middle_name} {resident.last_name}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            {resident.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{resident.email}</span>
                              </div>
                            )}
                            {resident.birth_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(resident.birth_date), 'MMMM d, yyyy')}</span>
                              </div>
                            )}
                            {resident.contact_number && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{resident.contact_number}</span>
                              </div>
                            )}
                            {resident.place_of_origin && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{resident.place_of_origin}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>Applied: {format(new Date(resident.created_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(resident)}
                            disabled={processingId === resident.id}
                          >
                            {processingId === resident.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(resident)}
                            disabled={processingId === resident.id}
                          >
                            {processingId === resident.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the registration for{" "}
              <strong>{selectedResident?.first_name} {selectedResident?.last_name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for Rejection (Optional)</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processingId === selectedResident?.id}
            >
              {processingId === selectedResident?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentApproval;
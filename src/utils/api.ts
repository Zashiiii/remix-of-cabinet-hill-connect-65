import { supabase } from '@/integrations/supabase/client';

export interface CertificateRequestData {
  certificateType: string;
  fullName: string;
  contactNumber: string;
  email?: string;
  householdNumber: string;
  birthDate: Date;
  purpose: string;
  priority: string;
}

export interface RequestStatus {
  controlNumber: string;
  certificateType: string;
  residentName: string;
  dateRequested: Date;
  status: "pending" | "for_review" | "approved" | "ready_for_pickup" | "released" | "rejected";
  purpose: string;
  remarks?: string;
}

/**
 * Submit a certificate request to Supabase
 * @param data - Certificate request form data
 * @returns Control number for tracking
 */
export const submitCertificateRequest = async (data: CertificateRequestData): Promise<string> => {
  // Generate control number (database trigger will also generate one if not provided)
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const controlNumber = `CERT-${dateStr}-${randomNum}`;

  const { error } = await supabase
    .from('certificate_requests')
    .insert({
      control_number: controlNumber,
      certificate_type: data.certificateType,
      resident_name: data.fullName,
      resident_contact: data.contactNumber,
      resident_email: data.email || null,
      purpose: data.purpose,
      priority: data.priority,
      status: 'Pending',
      requested_date: new Date().toISOString(),
    });

  if (error) {
    console.error('Error submitting certificate request:', error);
    throw new Error(error.message || 'Failed to submit request');
  }

  // Also store in localStorage for backward compatibility with dashboard
  try {
    const existingRequests = JSON.parse(localStorage.getItem('certificateRequests') || '[]');
    const newRequest = {
      id: controlNumber,
      residentName: data.fullName,
      certificateType: data.certificateType,
      dateSubmitted: new Date().toLocaleDateString(),
      status: 'pending',
      contactNumber: data.contactNumber,
      email: data.email,
      householdNumber: data.householdNumber,
      purpose: data.purpose,
    };
    
    const updatedRequests = Array.isArray(existingRequests) 
      ? [newRequest, ...existingRequests]
      : [newRequest];
    
    localStorage.setItem('certificateRequests', JSON.stringify(updatedRequests));
  } catch (e) {
    console.warn('Could not update localStorage:', e);
  }

  return controlNumber;
};

/**
 * Track a certificate request by control number
 * @param controlNumber - The control number to track
 * @returns Request status information
 */
export const trackRequest = async (controlNumber: string): Promise<RequestStatus | null> => {
  // First try to fetch from Supabase
  const { data, error } = await supabase
    .from('certificate_requests')
    .select('*')
    .eq('control_number', controlNumber)
    .single();

  if (data && !error) {
    // Map database status to our status type
    const statusMap: Record<string, RequestStatus['status']> = {
      'Pending': 'pending',
      'Processing': 'for_review',
      'Approved': 'approved',
      'Ready for Pickup': 'ready_for_pickup',
      'Released': 'released',
      'Rejected': 'rejected',
    };

    return {
      controlNumber: data.control_number,
      certificateType: data.certificate_type,
      residentName: data.resident_name,
      dateRequested: new Date(data.requested_date || Date.now()),
      status: statusMap[data.status || 'Pending'] || 'pending',
      purpose: data.purpose,
      remarks: data.admin_notes || data.rejection_reason || undefined,
    };
  }

  // Fallback to localStorage check
  try {
    const requests = JSON.parse(localStorage.getItem('certificateRequests') || '[]');
    if (Array.isArray(requests)) {
      const found = requests.find((r: any) => r.id === controlNumber);
      if (found) {
        return {
          controlNumber: found.id,
          certificateType: found.certificateType,
          residentName: found.residentName,
          dateRequested: new Date(found.dateSubmitted),
          status: found.status === 'approved' ? 'approved' : 
                  found.status === 'rejected' ? 'rejected' : 'pending',
          purpose: found.purpose || '',
          remarks: found.notes,
        };
      }
    }
  } catch (e) {
    console.warn('Could not check localStorage:', e);
  }

  return null;
};

/**
 * Fetch pending certificate requests from Supabase
 */
export const fetchPendingRequests = async () => {
  const { data, error } = await supabase.rpc('get_pending_requests');
  
  if (error) {
    console.error('Error fetching pending requests:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Update certificate request status
 */
export const updateRequestStatus = async (
  id: string, 
  status: string, 
  processedBy: string,
  notes?: string
) => {
  const updateData: Record<string, any> = {
    status,
    processed_by: processedBy,
    processed_date: new Date().toISOString(),
  };

  if (notes) {
    if (status === 'Rejected') {
      updateData.rejection_reason = notes;
    } else {
      updateData.admin_notes = notes;
    }
  }

  const { error } = await supabase
    .from('certificate_requests')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating request status:', error);
    throw error;
  }
};

/**
 * Fetch active announcements from Supabase
 */
export const fetchActiveAnnouncements = async () => {
  const { data, error } = await supabase.rpc('get_active_announcements');
  
  if (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Create a new announcement
 */
export const createAnnouncement = async (announcement: {
  title: string;
  content: string;
  titleTl?: string;
  contentTl?: string;
  type: string;
  createdBy?: string;
}) => {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: announcement.title,
      content: announcement.content,
      title_tl: announcement.titleTl,
      content_tl: announcement.contentTl,
      announcement_type: announcement.type,
      created_by: announcement.createdBy,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }

  return data;
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (
  id: string,
  announcement: {
    title?: string;
    content?: string;
    titleTl?: string;
    contentTl?: string;
    type?: string;
    isActive?: boolean;
  }
) => {
  const updateData: Record<string, any> = {};
  
  if (announcement.title !== undefined) updateData.title = announcement.title;
  if (announcement.content !== undefined) updateData.content = announcement.content;
  if (announcement.titleTl !== undefined) updateData.title_tl = announcement.titleTl;
  if (announcement.contentTl !== undefined) updateData.content_tl = announcement.contentTl;
  if (announcement.type !== undefined) updateData.announcement_type = announcement.type;
  if (announcement.isActive !== undefined) updateData.is_active = announcement.isActive;
  updateData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('announcements')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

/**
 * Delete an announcement (soft delete by setting is_active to false)
 */
export const deleteAnnouncement = async (id: string) => {
  const { error } = await supabase
    .from('announcements')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

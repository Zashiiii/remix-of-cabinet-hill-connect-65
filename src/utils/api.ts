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
  preferredPickupDate: Date;
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
 * Generate a control number for certificate requests
 */
const generateControlNumber = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `CERT-${dateStr}-${randomNum}`;
};

/**
 * Submit a certificate request to Supabase
 * Uses edge function first, falls back to direct insert if that fails
 * @param data - Certificate request form data
 * @returns Control number for tracking
 */
export const submitCertificateRequest = async (data: CertificateRequestData): Promise<string> => {
  // Validate required fields before sending
  if (!data.fullName || !data.contactNumber || !data.certificateType || !data.purpose) {
    throw new Error('Please fill in all required fields');
  }

  // Validate contact number format (11 digits starting with 09)
  if (!/^09\d{9}$/.test(data.contactNumber)) {
    throw new Error('Contact number must be 11 digits starting with 09');
  }

  // Validate household number (3-5 chars)
  if (!data.householdNumber || data.householdNumber.length < 3 || data.householdNumber.length > 5) {
    throw new Error('Household number must be 3-5 characters');
  }

  // Validate birth date is in the past
  if (!data.birthDate || data.birthDate > new Date()) {
    throw new Error('Birth date must be a past date');
  }

  // Validate pickup date is today or future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!data.preferredPickupDate || data.preferredPickupDate < today) {
    throw new Error('Preferred pickup date must be today or a future date');
  }

  console.log('Submitting certificate request:', {
    certificate_type: data.certificateType,
    resident_name: data.fullName,
    priority: data.priority,
  });

  let controlNumber: string | null = null;

  // Try edge function first
  try {
    console.log('Attempting edge function submission...');
    const { data: response, error } = await supabase.functions.invoke('submit-certificate', {
      body: {
        certificateType: data.certificateType,
        fullName: data.fullName,
        contactNumber: data.contactNumber,
        email: data.email || null,
        householdNumber: data.householdNumber,
        birthDate: data.birthDate.toISOString().split('T')[0],
        purpose: data.purpose,
        priority: data.priority,
        preferredPickupDate: data.preferredPickupDate.toISOString(),
      },
    });

    if (!error && response?.success && response?.controlNumber) {
      controlNumber = response.controlNumber;
      console.log('Edge function submission successful:', controlNumber);
    } else if (response?.error) {
      // Edge function returned an error response (validation error, etc.)
      console.error('Edge function returned error:', response.error);
      throw new Error(response.error);
    } else if (error) {
      console.warn('Edge function failed, will try fallback:', error.message);
    }
  } catch (edgeFunctionError: any) {
    // If it's a validation error from the edge function, throw it
    if (edgeFunctionError.message && !edgeFunctionError.message.includes('Failed to fetch') && !edgeFunctionError.message.includes('FunctionsHttpError')) {
      throw edgeFunctionError;
    }
    console.warn('Edge function unavailable, trying direct insert...', edgeFunctionError);
  }

  // Fallback: Direct Supabase insert if edge function failed
  if (!controlNumber) {
    console.log('Using fallback direct Supabase insert...');
    
    controlNumber = generateControlNumber();
    const now = new Date();
    
    // Capitalize priority
    const normalizedPriority = data.priority 
      ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase()
      : 'Regular';

    // Store additional info in resident_notes
    const additionalInfo = [];
    if (data.householdNumber) {
      additionalInfo.push(`Household: ${data.householdNumber}`);
    }
    if (data.birthDate) {
      additionalInfo.push(`Birth Date: ${data.birthDate.toISOString().split('T')[0]}`);
    }
    const residentNotes = additionalInfo.length > 0 ? additionalInfo.join(' | ') : null;

    const { error: insertError } = await supabase
      .from('certificate_requests')
      .insert({
        control_number: controlNumber,
        certificate_type: data.certificateType,
        resident_name: data.fullName,
        resident_contact: data.contactNumber,
        resident_email: data.email || null,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        requested_date: now.toISOString(),
        ready_date: data.preferredPickupDate.toISOString(),
        resident_notes: residentNotes,
      });

    if (insertError) {
      console.error('Direct insert failed:', insertError);
      throw new Error('Failed to submit request. Please try again or visit the barangay hall.');
    }

    console.log('Direct insert successful:', controlNumber);
  }

  // Store in localStorage for backward compatibility
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
    .maybeSingle();

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
 * Fetch all certificate requests with optional status filter
 */
export const fetchAllRequests = async (statusFilter?: string) => {
  let query = supabase
    .from('certificate_requests')
    .select('*')
    .order('resident_name', { ascending: true });
  
  if (statusFilter && statusFilter !== 'All') {
    // Normalize status for comparison
    const normalizedStatus = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase();
    query = query.eq('status', normalizedStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all requests:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch recent processed requests (last 30 days)
 */
export const fetchRecentProcessedRequests = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('certificate_requests')
    .select('*')
    .in('status', ['Approved', 'Rejected'])
    .gte('processed_date', thirtyDaysAgo.toISOString())
    .order('processed_date', { ascending: false });

  if (error) {
    console.error('Error fetching recent processed requests:', error);
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
  // Normalize status to match database format (capitalize first letter)
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  const updateData: Record<string, any> = {
    status: normalizedStatus,
    processed_by: processedBy,
  };
  
  // Only set processed_date for final statuses
  if (normalizedStatus === 'Approved' || normalizedStatus === 'Rejected') {
    updateData.processed_date = new Date().toISOString();
  }

  if (notes) {
    if (normalizedStatus === 'Rejected') {
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

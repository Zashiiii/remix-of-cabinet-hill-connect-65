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
  status: "pending" | "for_review" | "verifying" | "approved" | "ready_for_pickup" | "released" | "rejected";
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
    
    // Capitalize priority
    const normalizedPriority = data.priority 
      ? data.priority.charAt(0).toUpperCase() + data.priority.slice(1).toLowerCase()
      : 'Regular';

    const { error: insertError } = await supabase
      .from('certificate_requests')
      .insert({
        control_number: controlNumber,
        certificate_type: data.certificateType,
        full_name: data.fullName,
        contact_number: data.contactNumber,
        email: data.email || null,
        purpose: data.purpose,
        priority: normalizedPriority,
        status: 'Pending',
        preferred_pickup_date: data.preferredPickupDate.toISOString().split('T')[0],
        household_number: data.householdNumber || null,
        birth_date: data.birthDate.toISOString().split('T')[0],
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
 * Uses the secure RPC function that only returns limited public data
 * @param controlNumber - The control number to track
 * @returns Request status information
 */
export const trackRequest = async (controlNumber: string): Promise<RequestStatus | null> => {
  // Use the secure RPC function for public tracking
  const { data, error } = await supabase
    .rpc('track_certificate_request', { p_control_number: controlNumber });

  if (data && data.length > 0 && !error) {
    const request = data[0];
    
    // Map database status to our status type
    const statusMap: Record<string, RequestStatus['status']> = {
      'Pending': 'pending',
      'Processing': 'for_review',
      'Verifying': 'verifying',
      'Approved': 'approved',
      'Ready for Pickup': 'ready_for_pickup',
      'Released': 'released',
      'Rejected': 'rejected',
    };

    return {
      controlNumber: request.control_number,
      certificateType: request.certificate_type,
      residentName: request.full_name,
      dateRequested: new Date(request.created_at || Date.now()),
      status: statusMap[request.status || 'Pending'] || 'pending',
      purpose: request.purpose || '',
      remarks: request.rejection_reason || request.notes || undefined,
    };
  }

  // Fallback to localStorage check for offline tracking
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
 * Fetch all certificate requests with optional status filter (uses RPC for staff)
 */
export const fetchAllRequests = async (statusFilter?: string) => {
  // Use the SECURITY DEFINER RPC function to bypass RLS
  const { data, error } = await supabase.rpc('get_all_certificate_requests_for_staff', {
    p_status_filter: statusFilter || null
  });

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
  // Use RPC to fetch - the get_all function works for this too
  const { data, error } = await supabase.rpc('get_all_certificate_requests_for_staff', {
    p_status_filter: null
  });

  if (error) {
    console.error('Error fetching recent processed requests:', error);
    throw error;
  }

  // Filter for approved/rejected in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return (data || []).filter((item: any) => {
    const status = item.status?.toLowerCase();
    if (status !== 'approved' && status !== 'rejected') return false;
    const updatedAt = new Date(item.updated_at);
    return updatedAt >= thirtyDaysAgo;
  });
};

/**
 * Update certificate request status using RPC and send email notification
 */
export const updateRequestStatus = async (
  id: string, 
  status: string, 
  processedBy: string,
  notes?: string,
  sessionToken?: string
) => {
  // Normalize status to match database format (capitalize first letter)
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  // First fetch the request to get email and other details using RPC
  const allRequests = await fetchAllRequests();
  const requestData = allRequests.find((r: any) => r.id === id);

  // Use the RPC function to update (bypasses RLS)
  const { data, error } = await supabase.rpc('staff_update_request_status', {
    p_request_id: id,
    p_status: normalizedStatus,
    p_processed_by: processedBy,
    p_notes: notes || null
  });

  if (error) {
    console.error('Error updating request status:', error);
    throw error;
  }

  // Send email notification for approved/rejected status
  if (requestData?.email && (normalizedStatus === 'Approved' || normalizedStatus === 'Rejected')) {
    try {
      console.log('Sending notification email to:', requestData.email);
      
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          recipientEmail: requestData.email,
          residentName: requestData.full_name,
          certificateType: requestData.certificate_type,
          status: normalizedStatus,
          controlNumber: requestData.control_number,
          notes: notes || requestData.rejection_reason,
        },
      });

      if (emailError) {
        console.error('Failed to send notification email:', emailError);
      } else {
        console.log('Notification email sent successfully');
      }
    } catch (emailError) {
      console.error('Error invoking email function:', emailError);
    }
  }

  return data;
};

/**
 * Fetch active announcements from Supabase (for public view)
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
 * Fetch all announcements for staff dashboard
 */
export const fetchAnnouncementsForStaff = async () => {
  const { data, error } = await supabase.rpc('get_all_announcements_for_staff');
  
  if (error) {
    console.error('Error fetching announcements for staff:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Create a new announcement using RPC (bypasses RLS)
 */
export const createAnnouncement = async (announcement: {
  title: string;
  content: string;
  titleTl?: string;
  contentTl?: string;
  type: string;
  createdBy?: string;
}) => {
  const { data, error } = await supabase.rpc('staff_create_announcement', {
    p_title: announcement.title,
    p_content: announcement.content,
    p_title_tl: announcement.titleTl || null,
    p_content_tl: announcement.contentTl || null,
    p_type: announcement.type,
    p_created_by: announcement.createdBy || null,
  });

  if (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }

  return data;
};

/**
 * Update an announcement using RPC (bypasses RLS)
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
  const { error } = await supabase.rpc('staff_update_announcement', {
    p_id: id,
    p_title: announcement.title || null,
    p_content: announcement.content || null,
    p_title_tl: announcement.titleTl || null,
    p_content_tl: announcement.contentTl || null,
    p_type: announcement.type || null,
    p_is_active: announcement.isActive ?? null,
  });

  if (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

/**
 * Delete an announcement using RPC (soft delete)
 */
export const deleteAnnouncement = async (id: string) => {
  const { error } = await supabase.rpc('staff_delete_announcement', {
    p_id: id,
  });

  if (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

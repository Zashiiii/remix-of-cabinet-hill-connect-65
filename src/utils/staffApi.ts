/**
 * Staff API utilities
 * These functions call the staff-auth edge function with the stored session token
 * to perform database operations that bypass RLS
 */

const STORAGE_KEY = 'bris_staff_session';

const getStoredToken = (): string | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.token;
  } catch {
    return null;
  }
};

const callStaffApi = async (action: string, body: Record<string, unknown> = {}): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const token = getStoredToken();

  const response = await fetch(`${supabaseUrl}/functions/v1/staff-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    credentials: 'include',
    body: JSON.stringify({ action, token, ...body }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// Resident approval operations
export const getPendingRegistrations = async () => {
  const result = await callStaffApi('get-pending-registrations');
  return result.data || [];
};

export const approveResident = async (residentId: string, approvedBy: string) => {
  return callStaffApi('approve-resident', { residentId, approvedBy });
};

export const rejectResident = async (residentId: string, rejectedBy: string, rejectionReason?: string) => {
  return callStaffApi('reject-resident', { residentId, rejectedBy, rejectionReason });
};

// Certificate request operations
export const getCertificateRequests = async (statusFilter?: string) => {
  const result = await callStaffApi('get-certificate-requests', { statusFilter });
  return result.data || [];
};

export const updateCertificateRequestStatus = async (
  requestId: string,
  status: string,
  processedBy: string,
  notes?: string
) => {
  return callStaffApi('update-request-status', { requestId, status, processedBy, notes });
};

// Announcement operations
export const getAnnouncementsForStaff = async () => {
  const result = await callStaffApi('get-announcements');
  return result.data || [];
};

export const createAnnouncementStaff = async (announcement: {
  title: string;
  content: string;
  titleTl?: string;
  contentTl?: string;
  type?: string;
}) => {
  return callStaffApi('create-announcement', announcement);
};

export const updateAnnouncementStaff = async (
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
  return callStaffApi('update-announcement', { id, ...announcement });
};

export const deleteAnnouncementStaff = async (id: string) => {
  return callStaffApi('delete-announcement', { id });
};

// Dashboard stats
export const getResidentCount = async () => {
  const result = await callStaffApi('get-resident-count');
  return result.count || 0;
};

export const getPendingRegistrationCount = async () => {
  const result = await callStaffApi('get-pending-registration-count');
  return result.count || 0;
};

// Messages
export const getStaffMessages = async (staffId?: string) => {
  const result = await callStaffApi('get-staff-messages', { staffId });
  return result.data || [];
};

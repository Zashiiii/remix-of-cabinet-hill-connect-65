// Role-Based Access Control (RBAC) definitions and helper functions

export type StaffRole = 
  | 'admin' 
  | 'barangay_captain' 
  | 'barangay_official' 
  | 'secretary' 
  | 'sk_chairman';

export type FeatureKey =
  | 'staff_management'
  | 'audit_logs'
  | 'resident_approval'
  | 'ecological_submissions'
  | 'name_change_requests'
  | 'household_link_requests'
  | 'view_reports'
  | 'certificate_requests'
  | 'manage_residents'
  | 'manage_households'
  | 'incidents'
  | 'announcements'
  | 'ecological_profile'
  | 'create_certificate'
  | 'settings'
  | 'monitoring_reports';

// Define which roles can access each feature
const ROLE_PERMISSIONS: Record<FeatureKey, StaffRole[]> = {
  // Admin-level features
  staff_management: ['admin', 'barangay_captain'],
  audit_logs: ['admin', 'barangay_captain'],
  monitoring_reports: ['admin'],
  
  // Management features
  resident_approval: ['admin', 'barangay_captain', 'barangay_official'],
  ecological_submissions: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  name_change_requests: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  household_link_requests: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  manage_residents: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  manage_households: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  announcements: ['admin', 'barangay_captain', 'barangay_official', 'secretary'],
  
  // Common features
  view_reports: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
  certificate_requests: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
  ecological_profile: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
  create_certificate: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
  incidents: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
  settings: ['admin', 'barangay_captain', 'barangay_official', 'secretary', 'sk_chairman'],
};

// Role display names for UI
export const ROLE_DISPLAY_NAMES: Record<StaffRole, string> = {
  admin: 'Administrator',
  barangay_captain: 'Barangay Captain',
  barangay_official: 'Barangay Official',
  secretary: 'Secretary',
  sk_chairman: 'SK Chairman',
};

// Check if a role has permission for a feature
export const hasPermission = (role: string | undefined, feature: FeatureKey): boolean => {
  if (!role) return false;
  const allowedRoles = ROLE_PERMISSIONS[feature];
  return allowedRoles?.includes(role as StaffRole) ?? false;
};

// Get all features a role can access
export const getPermittedFeatures = (role: string | undefined): FeatureKey[] => {
  if (!role) return [];
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(role as StaffRole))
    .map(([feature]) => feature as FeatureKey);
};

// Check if role can access any admin section features
export const canAccessAdminSection = (role: string | undefined): boolean => {
  if (!role) return false;
  return (
    hasPermission(role, 'staff_management') ||
    hasPermission(role, 'audit_logs') ||
    hasPermission(role, 'resident_approval') ||
    hasPermission(role, 'ecological_submissions') ||
    hasPermission(role, 'name_change_requests') ||
    hasPermission(role, 'household_link_requests') ||
    hasPermission(role, 'monitoring_reports')
  );
};

// Check if role is an admin-level role (can manage staff)
export const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return role === 'admin' || role === 'barangay_captain';
};

// Get role display name
export const getRoleDisplayName = (role: string | undefined): string => {
  if (!role) return 'Unknown';
  return ROLE_DISPLAY_NAMES[role as StaffRole] || role;
};

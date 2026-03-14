export const STAFF_FORCED_LOGOUT_KEY = "bris_staff_forced_logout";
export const RESIDENT_FORCED_LOGOUT_KEY = "bris_resident_forced_logout";

export const markStaffForcedLogout = () => {
  localStorage.setItem(STAFF_FORCED_LOGOUT_KEY, String(Date.now()));
};

export const clearStaffForcedLogout = () => {
  localStorage.removeItem(STAFF_FORCED_LOGOUT_KEY);
};

export const isStaffForcedLogout = () => {
  return localStorage.getItem(STAFF_FORCED_LOGOUT_KEY) !== null;
};

export const markResidentForcedLogout = () => {
  localStorage.setItem(RESIDENT_FORCED_LOGOUT_KEY, String(Date.now()));
};

export const clearResidentForcedLogout = () => {
  localStorage.removeItem(RESIDENT_FORCED_LOGOUT_KEY);
};

export const isResidentForcedLogout = () => {
  return localStorage.getItem(RESIDENT_FORCED_LOGOUT_KEY) !== null;
};

/**
 * Overwrites browser history entries and performs a hard redirect.
 * This prevents back/forward navigation from reaching protected pages after logout.
 */
export const secureLogoutRedirect = (targetUrl: string = "/") => {
  // Push multiple entries to overwrite back-history with the target URL
  window.history.pushState(null, '', targetUrl);
  window.history.pushState(null, '', targetUrl);
  window.history.pushState(null, '', targetUrl);
  // Hard redirect — replaces the current entry and forces a full page load
  window.location.replace(targetUrl);
};

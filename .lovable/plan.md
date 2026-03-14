

## Plan: Harden Auth Guards Against Browser Back/Forward After Logout

### Analysis

The existing auth system is already robust with forced-logout flags, synchronous ProtectedRoute checks, session revalidation on popstate/focus, and `window.location.replace` on logout. However, there are a few remaining gaps that could cause the reported behavior:

### Identified Issues

1. **No history cleanup after logout** — `window.location.replace("/")` replaces only the current entry. The browser may still have forward history entries for protected pages. Pressing forward could briefly show a loader before redirecting.

2. **Resident pages with redundant internal auth checks** — `EcologicalProfile.tsx` and `Incidents.tsx` have their own `useEffect` auth redirects that use `navigate()` (not `replace`), which could leave history entries.

3. **Potential bfcache restoration** — The `pageshow` handler in App.tsx reloads on bfcache, but the popstate handler only reloads if forced-logout is set. If the forced-logout flag is later cleared (by a new login), pressing back could restore a stale page from a different session.

4. **No explicit history state management** — After logout, the browser history stack still contains protected route entries.

### Changes

**1. Create a centralized `secureLogoutRedirect` utility (`src/utils/authNavigationGuard.ts`)**
- After marking forced logout and clearing tokens, push multiple history entries to "/" to overwrite back-history, then call `window.location.replace`
- This prevents the browser from navigating forward/back to protected URLs

**2. Update all logout handlers to use `secureLogoutRedirect`**
- `src/pages/resident/Dashboard.tsx` — use centralized redirect
- `src/pages/resident/Incidents.tsx` — use centralized redirect
- `src/pages/StaffDashboard.tsx` — use centralized redirect
- `src/hooks/useResidentAuth.ts` — logout function uses centralized redirect pattern

**3. Remove redundant internal auth checks from resident pages**
- `src/pages/resident/EcologicalProfile.tsx` — remove the manual `useEffect` auth redirect (already wrapped in `ResidentProtectedRoute`)
- `src/pages/resident/Incidents.tsx` — same cleanup if applicable

**4. Strengthen the `popstate` handler in `App.tsx`**
- On popstate, always re-check both forced-logout flags AND verify that the current URL matches a protected path — if so and no valid session, redirect immediately regardless of forced-logout state

**5. Add `replaceState` call inside `ProtectedRoute` redirects**
- Before the `<Navigate replace>`, call `window.history.replaceState(null, '', redirectTo)` to ensure the browser's address bar and history stack are cleaned up

### Secure Logout Redirect Logic
```typescript
export const secureLogoutRedirect = (targetUrl: string = "/") => {
  // Overwrite recent history entries to prevent back-navigation
  window.history.pushState(null, '', targetUrl);
  window.history.pushState(null, '', targetUrl);
  window.history.pushState(null, '', targetUrl);
  window.location.replace(targetUrl);
};
```


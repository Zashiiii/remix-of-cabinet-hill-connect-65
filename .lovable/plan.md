

## Plan: Fix Ecological Profile Page Layout and Add Boarding House Support

### 1. Match Layout with Other Resident Pages

The Ecological Profile page is missing the **ResidentSidebar** that all other resident pages have (Dashboard, Incidents, etc.). The fix:

- Import the sidebar components and `useResidentAuth` hook into `src/pages/resident/EcologicalProfile.tsx`
- Add the same `ResidentSidebar` component (with navigation menu items, logout button, etc.) that exists in Dashboard and Incidents pages
- Set `activeTab` to `"ecological-profile"` so the correct menu item is highlighted
- Add `SidebarTrigger` in the main content area for mobile collapse/expand

### 2. Add Boarding House as a Dwelling Type Option

In `src/components/resident/EcologicalProfileForm.tsx`, add "Boarding House" to the `DWELLING_TYPES` array:

```
const DWELLING_TYPES = ["Permanent concrete", "Semi Permanent", "Temporary", "Boarding House", "Others"];
```

This will automatically appear in the Housing tab's Dwelling Type dropdown since it maps from the array.

### Files to modify:
- `src/pages/resident/EcologicalProfile.tsx` — Add ResidentSidebar, auth logic, and full layout matching other pages
- `src/components/resident/EcologicalProfileForm.tsx` — Add "Boarding House" to DWELLING_TYPES


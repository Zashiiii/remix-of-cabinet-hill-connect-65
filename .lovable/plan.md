

## Plan: Improve Mobile Responsiveness Across All Pages

### Issues Identified

1. **StaffDashboard main content padding** (`p-6` with no mobile reduction) -- content bleeds tight on small screens
2. **StaffDashboard header** -- `px-6` fixed, no responsive reduction; title truncates on small screens
3. **StaffDashboard tables** (Urgent Requests, Recent Certificates, Recent Incidents) -- standard `<Table>` overflows horizontally on mobile with no scroll wrapper
4. **Services grid** -- `md:grid-cols-3` jumps from 1 to 3 columns, skipping a 2-column tablet breakpoint (4 items, so last row has 1 lonely card)
5. **Auth page tabs** -- 3-column tab triggers (`grid-cols-3`) are very cramped on small phones (320px)
6. **Auth signup form** -- `grid-cols-2` for first/last name fields with no mobile breakpoint, fields become too narrow on 320px screens
7. **EcologicalProfile page** -- broken JSX nesting (Alert is inside the flex header div, not properly closed), causes layout issues
8. **Resident Dashboard "My Requests" header** -- `flex-row` with button doesn't wrap on small screens
9. **StaffDashboard certificate requests tab** -- filter/search toolbar likely overflows on mobile
10. **Footer** -- copyright year hardcoded as 2024 (minor, but worth fixing to dynamic)

### Changes

#### 1. StaffDashboard (`src/pages/StaffDashboard.tsx`)
- Change main content padding from `p-6` to `p-4 md:p-6`
- Change header `px-6` to `px-4 md:px-6`
- Wrap all `<Table>` elements on the home tab in `<div className="overflow-x-auto">` for horizontal scroll on mobile
- Make header title smaller on mobile: `text-lg md:text-xl`

#### 2. Services (`src/components/Services.tsx`)
- Change grid from `md:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` (4 items fits better in 2x2 on tablet, 4 on desktop)

#### 3. Auth page (`src/pages/Auth.tsx`)
- Change signup name fields from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- Tab triggers are fine at 3 cols since they use short labels

#### 4. EcologicalProfile (`src/pages/resident/EcologicalProfile.tsx`)
- Fix the broken JSX nesting -- close the header div before the Alert

#### 5. Resident Dashboard (`src/pages/resident/Dashboard.tsx`)
- Add `flex-wrap` to the "My Requests" card header so the "New Request" button wraps on mobile
- Change the requests header from `flex-row` to responsive wrapping

#### 6. Footer (`src/components/Footer.tsx`)
- Use `new Date().getFullYear()` instead of hardcoded 2024

#### 7. StaffDashboard home tab tables
- All three tables (Urgent, Recent Certificates, Recent Incidents) get `overflow-x-auto` wrapper
- Add `min-w-[600px]` to Table inside to ensure proper column widths

### Technical Details

- All changes use existing Tailwind responsive utilities (`sm:`, `md:`, `lg:`)
- No new dependencies needed
- Table overflow fix uses standard CSS overflow pattern
- EcologicalProfile JSX fix is a structural correction (misplaced closing div)

**Files to modify:**
- `src/pages/StaffDashboard.tsx` (padding, table overflow wrappers, header sizing)
- `src/components/Services.tsx` (grid breakpoints)
- `src/pages/Auth.tsx` (signup form grid)
- `src/pages/resident/EcologicalProfile.tsx` (fix broken JSX)
- `src/pages/resident/Dashboard.tsx` (flex-wrap on request header)
- `src/components/Footer.tsx` (dynamic year)


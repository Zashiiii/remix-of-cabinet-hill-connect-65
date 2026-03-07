

## Plan: Card-Based Mobile Tables + Resident Bottom Navigation

### 1. Staff Dashboard: Card-Based Mobile Layouts for Home Tab Tables

Convert the three home tab tables (Urgent Requests, Recent Certificates, Recent Incidents) to show as **card lists on mobile** and **tables on desktop**.

**Approach**: Use a `hidden md:block` wrapper for the table and a `md:hidden` wrapper for a card-based list. Each card displays the same data fields stacked vertically.

**File**: `src/pages/StaffDashboard.tsx`

For each of the three tables (lines ~1784-1816, ~1891-1914, ~1939-1976):
- Wrap existing `overflow-x-auto` + `Table` in `<div className="hidden md:block">`
- Add a sibling `<div className="md:hidden space-y-3">` with mapped card items
- Each card: bordered div with resident name, type, date, status badge, and priority badge (where applicable)

### 2. Resident Dashboard: Mobile Bottom Navigation Bar

Add a fixed bottom navigation bar visible only on mobile (`md:hidden`) with 5 key tabs: Dashboard, Requests, Messages, Incidents, Profile.

**File**: `src/pages/resident/Dashboard.tsx`

- Create a `<nav>` element fixed to the bottom of the screen with `fixed bottom-0 left-0 right-0 md:hidden`
- 5 icon buttons mapping to existing tab/navigation handlers
- Active tab highlighted with primary color
- Add `pb-16 md:pb-0` to the main content area to prevent content from being hidden behind the nav bar
- Include unread message count badge on Messages icon

**Files to modify:**
- `src/pages/StaffDashboard.tsx` (3 table sections → card alternatives)
- `src/pages/resident/Dashboard.tsx` (bottom nav bar + padding adjustment)


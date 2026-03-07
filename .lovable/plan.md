

## Plan: Swipe Gestures + Pull-to-Refresh for Resident Dashboard

### Testing Results
- Homepage at 375px: Renders correctly with hamburger menu, hero, and content
- Mobile bottom navigation bar is implemented and functional
- Staff dashboard mobile card layouts are in place (3 sections with `md:hidden` card views)
- Resident bottom nav has 5 tabs: Home, Requests, Messages, Incidents, Profile

### Changes

#### 1. Add Swipe Gestures to Resident Bottom Navigation
**File**: `src/pages/resident/Dashboard.tsx`

- Add touch event handlers (`touchstart`, `touchmove`, `touchend`) to the main content area
- Track horizontal swipe distance and direction
- On left swipe: navigate to the next tab in order
- On right swipe: navigate to the previous tab in order
- Tab order: `["dashboard", "requests", "messages", "incidents", "profile"]`
- Minimum swipe threshold of ~50px to avoid accidental triggers
- Ignore vertical scrolling (check if horizontal movement > vertical movement)

No new dependencies needed -- uses native touch events via React's `onTouchStart`, `onTouchMove`, `onTouchEnd`.

#### 2. Add Pull-to-Refresh for Resident Dashboard
**File**: `src/pages/resident/Dashboard.tsx`

- Add touch event handlers for vertical pull-down gesture on the main content area
- Only trigger when scrolled to top (`scrollTop === 0`) and pulling down
- Show a visual indicator (spinner + "Pull to refresh" / "Release to refresh" text) at the top of the content area
- On release past threshold (~60px): call `loadData()` to refresh all dashboard data
- Add a `isRefreshing` state to show loading spinner during refresh
- CSS transition for smooth pull indicator animation

No new dependencies -- uses native touch events and existing `Loader2` icon from lucide-react.

#### 3. Apply swipe detection only on mobile (`md:hidden` breakpoint)
- Use `useIsMobile()` hook (already exists) to conditionally enable touch handlers
- Prevents interference with desktop interactions

**Files to modify:**
- `src/pages/resident/Dashboard.tsx` (swipe gestures, pull-to-refresh, touch handlers)


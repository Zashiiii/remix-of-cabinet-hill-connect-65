

## Problem

The RBI Form C (Monitoring Report) requires manual data entry for all demographic counts and location fields. The user wants:

1. **Auto-populate age bracket and summary counts** from the actual residents/households data in the database
2. **Remove Region/Province/City/Barangay input fields** from the form UI but **hardcode** them in print output and database:
   - Region: CAR (Cordillera Administrative Region)
   - Province: Benguet
   - City/Municipality: Baguio City
   - Barangay: Salud Mitra
3. **Auto-sync total inhabitants, total households, and average household size** from real data

## Plan

### 1. Create a new edge function action: `sync-monitoring-report-data`

Add a new action in `supabase/functions/staff-auth/index.ts` that queries the `residents` and `households` tables to compute:

- **Age bracket counts** (male/female) by calculating age from `birth_date` and grouping by `gender` into the 17 age brackets
- **Total inhabitants** (count of approved, non-deleted residents)
- **Total households** (count of households)
- **Average household size** (inhabitants / households)
- **Sector data** where possible (e.g., employment_status for labor_force/unemployed, PWD counts, civil_status for single/married, etc.)

The SQL will use `birth_date`, `gender`, `employment_status`, `civil_status`, and other resident fields to compute these.

### 2. Update `src/utils/staffApi.ts`

Add a new function `syncMonitoringReportData()` that calls the new action.

### 3. Update `src/components/staff/MonitoringReportForm.tsx`

- **Remove** the Region, Province, City/Municipality, and Barangay input fields from the form UI
- **Hardcode** these values: region="CAR (Cordillera Administrative Region)", province="Benguet", city_municipality="Baguio City", barangay="Salud Mitra"
- **Add a "Sync from Database" button** that calls the sync action and populates:
  - Age bracket rows (male/female counts)
  - Total inhabitants, total households, average household size
  - Sector data where computable
- Auto-sync on form load for new reports
- Keep fields editable so staff can adjust after syncing (e.g., registered voters, total families must still be manual)

### 4. Update `buildPayload` and print component

- Always send the hardcoded location values in `buildPayload`
- Print component continues to receive and display them normally

### Files to change

| File | Change |
|------|--------|
| `supabase/functions/staff-auth/index.ts` | Add `sync-monitoring-report-data` action with SQL aggregation |
| `src/utils/staffApi.ts` | Add `syncMonitoringReportData()` export |
| `src/components/staff/MonitoringReportForm.tsx` | Remove location inputs, hardcode values, add sync button, auto-populate on load |




## Problem

The certificate download and "Mark as Released" features fail because they query the `certificate_requests` table **directly via the Supabase client**. Staff are authenticated via httpOnly cookies (not Supabase Auth), so `auth.uid()` is null. The RLS SELECT policy on `certificate_requests` requires `has_role(auth.uid(), 'staff')`, which evaluates to false -- returning 0 rows.

This is the same pattern that was already fixed for incidents: all staff data operations must go through the `staff-auth` edge function.

### Affected operations
1. **`fetchCertificateDataForBulk`** (`certificatePdf.ts`) -- direct `supabase.from('certificate_requests').select(...)` fails due to RLS
2. **`handleMarkAsReleased`** (`StaffDashboard.tsx`) -- direct `supabase.from('certificate_requests').select('id').eq('control_number', ...)` also fails
3. **`handleBulkDownload`** -- depends on `fetchCertificateDataForBulk`, so it cascades

## Fix

### 1. Add edge function handlers in `staff-auth/index.ts`

Add two new actions:
- **`get-certificate-data-for-download`**: accepts a control number, returns the certificate request joined with resident and household data (using service role, bypassing RLS)
- **`update-certificate-status-by-control-number`**: accepts a control number and new status, updates via service role

### 2. Add API helpers in `staffApi.ts`

- `getCertificateDataForDownload(controlNumber)` -- calls the new edge function action
- `updateCertificateStatusByControlNumber(controlNumber, status, processedBy, notes)` -- calls the new action

### 3. Update `certificatePdf.ts`

Replace the direct Supabase query in `fetchCertificateDataForBulk` with a call to the new `getCertificateDataForDownload` helper.

### 4. Update `StaffDashboard.tsx`

In `handleMarkAsReleased`, replace the direct Supabase query with the new `updateCertificateStatusByControlNumber` helper.

### 5. Deploy edge function

Deploy the updated `staff-auth` edge function.


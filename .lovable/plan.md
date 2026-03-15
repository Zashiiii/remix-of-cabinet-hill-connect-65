

## Problem

When a resident submits an Ecological Profile and staff approves it, the `apply_ecological_submission_to_household` database function creates/updates the household and processes household members from the JSON array. However, it **never links the submitting resident** (identified by `submitted_by_resident_id`) to the household.

The member-matching logic searches for existing residents by name **within the same household** (`WHERE household_id = v_household_id`), so it will never find the submitting resident whose `household_id` is still `null`. This means the submitter remains unlinked, and the certificate request form stays blocked.

### Evidence from database
- Ecological submission `bd0e84b1...` is **approved**, linked to household `a22adaa5...` (HH-001)
- Resident `09c544bc...` (the submitter) still has `household_id = null`

## Fix

Modify the `apply_ecological_submission_to_household` database function to add one step after the household is created/updated: **link the submitting resident to the household** if they have a `submitted_by_resident_id` and their `household_id` is currently null.

### Database migration (single SQL statement)

Add the following logic near the end of the function (before processing household members):

```sql
-- Link the submitting resident to the household
IF v_submission.submitted_by_resident_id IS NOT NULL THEN
  UPDATE public.residents
  SET household_id = v_household_id, updated_at = now()
  WHERE id = v_submission.submitted_by_resident_id
    AND household_id IS NULL;
END IF;
```

This ensures that when a resident submits their ecological profile and it gets approved, they are automatically assigned to the household they described -- unlocking the certificate request form.

### Additional one-time data fix

Run a query to fix the current resident who is already in this state:

```sql
UPDATE residents
SET household_id = 'a22adaa5-a610-4ff3-a54c-d4c274d94fd3', updated_at = now()
WHERE id = '09c544bc-3e5d-4e1a-a3e6-1effff48d69b'
  AND household_id IS NULL;
```

### No frontend changes needed

The `ResidentCertificateRequestForm` already correctly checks for `householdNumber` -- once the resident has a `household_id`, the form will unlock automatically.


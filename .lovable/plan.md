

## Problem

The "Auto-translate to Tagalog" button is placed between the English Title and Tagalog Title fields, making it appear as though it only translates the title. In reality, the handler (`handleAutoTranslate`) already sends both `title` and `description` to the edge function and populates both Tagalog fields. This is purely a UI placement issue.

## Plan

**Move the auto-translate button** below the Description (English) field — after both English inputs are filled — so it visually communicates that it translates both title and description at once.

### Layout change in `src/pages/StaffDashboard.tsx` (~lines 3312–3366):

**Before:**
1. Title (English)
2. **[Auto-translate button]**
3. Title (Tagalog)
4. Description (English)
5. Description (Tagalog)

**After:**
1. Title (English)
2. Description (English)
3. **[Auto-translate button]** — label: "Auto-translate Title & Description to Tagalog"
4. Title (Tagalog)
5. Description (Tagalog)

### Single file edit:
- **`src/pages/StaffDashboard.tsx`**: Reorder the form fields as above and update the button label to "Auto-translate to Tagalog" (already clear with the new position showing it covers both fields).

No backend or edge function changes needed — the translation logic already handles both fields correctly.


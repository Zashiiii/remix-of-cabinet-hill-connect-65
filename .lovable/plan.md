

## Problem

The `Tabs` component (lines 310-331) has `TabsTrigger` elements for "Incident Reports" and "Certificate Requests", but the `Tabs` wrapper closes at line 331 (`</Tabs>`) **before** the content that depends on `activeTab` (lines 554-649). 

The Radix `Tabs` component uses internal context to manage tab switching. Since the tab triggers are inside `<Tabs>` but the actual content rendering relies on manual `activeTab` state checks rendered **outside** the `<Tabs>` component, clicking the triggers does update `activeTab` via `onValueChange={setActiveTab}` -- so the tabs should technically work.

However, looking more carefully: the tabs at lines 310-331 switch between "incidents" and "certificates" views for the **table data** at the bottom. But the **analytics category filter** (lines 334-357) sits between the tabs and the table content, which creates a confusing UX. The real issue is that clicking the tab triggers likely **does** work for switching the table, but the analytics section dominates the view and doesn't scroll down to show the table content change.

Wait -- let me re-read the user's complaint: "if I press the incident reports or certificate requests, **nothing happens**." The `Tabs` component with `onValueChange={setActiveTab}` should update state. The content at lines 554 and 603 checks `activeTab`. This should work.

Let me check if there's a CSS/rendering issue. The `Tabs` closes at line 331, then analytics content follows, then search/filter, then the conditional table rendering. The tabs **do** control the table at the bottom, but the user probably can't see the table change because it's scrolled below the analytics charts.

The most likely issue: The tab triggers visually appear to do nothing because the large analytics section sits between the tab triggers and the actual tab content (tables). When the user clicks a tab trigger, the table below the analytics changes, but the user can't see it without scrolling down.

## Plan

1. **Move the tab content closer to the tab triggers** -- restructure the layout so the Incident Reports / Certificate Requests tabs and their corresponding tables appear together, either above or below the analytics section.

2. Specifically:
   - Keep the analytics category filter and charts section at the top
   - Move the `Tabs` component (with its triggers) **below** the analytics section, right before the search/filter and table content
   - This way, when the user clicks "Incident Reports" or "Certificate Requests", the table immediately below changes visibly

### Files to change

**`src/components/staff/ViewReportsTab.tsx`**
- Move the `<Tabs>` block (lines 310-331) from its current position to just before the search/filter section (before line 452)
- This places the tab switcher directly above the tables it controls, making the switch visually obvious

### Technical detail
- The `Tabs` component at line 310 will be removed from its current location
- A new `Tabs` block will be inserted around line 450 (after the analytics `<Separator>`) wrapping the tab triggers
- No logic changes needed -- `activeTab` state and `onValueChange` already work correctly


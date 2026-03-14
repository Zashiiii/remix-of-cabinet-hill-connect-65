

## Plan: Redirect to My Requests After Certificate Submission

### Current Flow
After submitting a certificate request, a `SuccessModal` dialog appears with the control number. The user must manually navigate away.

### New Flow
1. Remove the `SuccessModal` from the request tab
2. On successful submission, auto-switch to the "requests" tab
3. Show a persistent success banner at the top of My Requests with the control number, a copy button, and a "what happens next" note
4. Highlight the newly submitted request card with a green left border + "New" badge (matched by control number)
5. Add a "Track Status" button on the highlighted card

### Changes

**`src/pages/resident/Dashboard.tsx`**
- `handleRequestSuccess`: Instead of opening `SuccessModal`, set `submittedControlNumber` and switch to `setActiveTab("requests")`
- Remove `SuccessModal` import and usage from the request tab
- Add a success banner at the top of the "requests" tab content (above the Card) when `submittedControlNumber` is set — shows control number with copy button, brief next-steps text, and a dismiss button
- On each request card, compare `request.controlNumber === submittedControlNumber` — if match, add `border-l-4 border-green-500 bg-green-50/50` styling and a small "New" badge
- Add a "Track Status" button on the highlighted card that navigates to `/track-request`
- Clear `submittedControlNumber` when user dismisses the banner or navigates away from requests tab

**No other files need changes.** The `ResidentCertificateRequestForm` already calls `onSuccess(controlNumber)` which we just redirect differently. The `SuccessModal` component stays in the codebase (used by the public `RequestCertificate` page).




## Plan: Add Messages/Inbox to Staff Dashboard Sidebar

### Problem
The staff portal has a floating `StaffChatWidget` (bubble icon in the corner) for messaging, but there's no dedicated "Messages" section in the sidebar navigation — making it inconsistent with the resident portal which has a full Messages page.

### Changes

**1. Add `messages` to role permissions (`src/utils/rolePermissions.ts`)**
- Add `'messages'` to the `FeatureKey` type
- Grant access to all staff roles (admin, barangay_captain, barangay_official, secretary, sk_chairman)

**2. Create `StaffMessagesTab` component (`src/components/staff/StaffMessagesTab.tsx`)**
- Extract and adapt the messaging logic from `StaffChatWidget.tsx` into a full-page tab component
- Full-width layout with conversation list on the left, conversation detail on the right (or stacked on mobile)
- Features: inbox list with unread/all filter, compose new message, view conversation thread, reply, mark as read, mark all as read
- Reuses existing RPC functions: `get_staff_messages`, `staff_send_reply`, `staff_send_new_message`, `staff_mark_message_read`, `get_residents_for_messaging_staff`

**3. Add Messages to sidebar navigation (`src/pages/StaffDashboard.tsx`)**
- Add a "Messages" menu item with `MessageSquare` icon to the Administration sidebar group (or as a standalone group)
- Include unread message count badge
- Render `StaffMessagesTab` when `activeTab === "messages"`
- Fetch unread count using `get_staff_unread_message_count` RPC

**4. Keep `StaffChatWidget` as-is**
- The floating widget remains for quick access; the sidebar tab provides the full inbox experience


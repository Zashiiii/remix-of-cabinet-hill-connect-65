

## Plan: Add Real-Time Message Notification with Sound Alert and Unread Badge

### Problem
The Messages sidebar item has no unread count badge, and there's no sound notification when new messages arrive.

### Changes

**1. Add unread message count + sound alert in `src/pages/StaffDashboard.tsx`**
- Fetch unread count using `get_staff_unread_message_count` RPC on mount and via realtime subscription
- Pass the count as `badge` to the Messages `renderMenuItem` call
- Track previous unread count; when it increases, play a notification sound
- Use the Web Audio API (`AudioContext`) to generate a short notification tone (no external audio file needed)

**2. Update the Messages sidebar item (line ~346)**
```tsx
// Before
renderMenuItem({ title: "Messages", icon: MessageSquare, tab: "messages" })

// After  
renderMenuItem({ title: "Messages", icon: MessageSquare, tab: "messages", badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined })
```

**3. Sound notification logic**
- Subscribe to `postgres_changes` on the `messages` table for new inserts where `recipient_type = 'staff'`
- When a new message arrives and the sender is a resident, play a short beep using `AudioContext.createOscillator()`
- Re-fetch unread count on each realtime event to keep badge in sync

### Technical Detail
- Sound generation uses Web Audio API (no file dependency):
```typescript
const playNotificationSound = () => {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.frequency.value = 880;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};
```
- The realtime channel is set up alongside existing ones in the dashboard, cleaned up on unmount


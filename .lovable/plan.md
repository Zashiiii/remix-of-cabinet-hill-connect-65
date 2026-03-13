

## Plan: Announcements -- Limit to 3, "View More", Important on Top

### Changes

**1. Landing Page (`src/components/Announcements.tsx`)**
- After mapping announcements, sort them so `type === "important"` come first, then by date descending.
- Show only the first 3 announcements by default.
- Add a "View More Announcements" button below when there are more than 3.
- Clicking it expands to show all announcements.
- Add a "View Less" button to collapse back to 3.

**2. Resident Dashboard (`src/pages/resident/Dashboard.tsx`)**
- In the announcement loading logic (line ~256), remove the `.slice(0, 3)` hard limit.
- Sort announcements so `important` type is always first.
- Show only 3 by default with a `showAllAnnouncements` state toggle.
- Add a "View More Announcements" / "View Less" button when count exceeds 3.

### Technical Details

Sorting logic (applied in both files after mapping):
```typescript
mapped.sort((a, b) => {
  if (a.type === "important" && b.type !== "important") return -1;
  if (a.type !== "important" && b.type === "important") return 1;
  return new Date(b.date).getTime() - new Date(a.date).getTime();
});
```

Display logic:
```typescript
const [showAll, setShowAll] = useState(false);
const displayed = showAll ? announcements : announcements.slice(0, 3);
```

Both locations get a toggle button:
```tsx
{announcements.length > 3 && (
  <Button variant="outline" onClick={() => setShowAll(!showAll)}>
    {showAll ? "View Less" : `View More Announcements (${announcements.length - 3} more)`}
  </Button>
)}
```




## Plan: Clickable Announcement Images with Full-Size Dialog

### Changes

**`src/pages/resident/Dashboard.tsx`**

1. Import `Dialog`, `DialogContent` from `@/components/ui/dialog`.
2. In `AnnouncementItem`, add state for `imageOpen` (boolean).
3. Wrap the `<img>` in a clickable `cursor-pointer` element that sets `imageOpen = true`.
4. Add a `Dialog` that shows the full-size image when open — using `max-w-4xl` content with the image at full width, `object-contain` so it's fully visible.

### Technical Detail

```tsx
const [imageOpen, setImageOpen] = useState(false);

// Replace the img tag:
<img
  src={announcement.imageUrl}
  alt={announcement.title}
  className="w-full h-48 sm:h-56 object-cover rounded-md mt-2 cursor-pointer hover:opacity-90 transition-opacity"
  loading="lazy"
  onClick={() => setImageOpen(true)}
/>

// Add dialog after the img:
<Dialog open={imageOpen} onOpenChange={setImageOpen}>
  <DialogContent className="max-w-4xl p-2">
    <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-auto object-contain rounded" />
  </DialogContent>
</Dialog>
```

Also apply the same pattern to the landing page `AnnouncementCard` in `src/components/Announcements.tsx` for consistency.


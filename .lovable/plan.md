

## Plan: Polish Announcement Cards in Resident Portal

### Changes to `src/pages/resident/Dashboard.tsx` — `AnnouncementItem` component (lines 158-202)

**Redesign the card layout:**

1. **Compact image** — Change from full-width `h-48`/`h-56` image to a small thumbnail (e.g. `w-16 h-16` or `w-20 h-20`) displayed inline next to the text using a horizontal flex layout. This dramatically reduces card height.

2. **Header row** — Show title, category badge, and date on the same line (flex row with items centered). Move date from the bottom to the top-right area next to the badge.

3. **Content preview** — Reduce `line-clamp-3` to `line-clamp-2` for a tighter 2-line excerpt by default. Keep View More/View Less toggle as-is.

4. **Spacing** — Reduce padding from `p-3` to `p-3` (keep) but tighten internal gaps: `mt-2` → `mt-1` on text, remove `mt-1` on date (now in header). Use `gap-3` between thumbnail and text block.

5. **Image dialog** — Keep the click-to-expand full-screen dialog unchanged.

### Revised card structure:
```
┌─────────────────────────────────────────────┐
│ [thumb]  Title                 Badge  Date  │
│          2-line preview text...              │
│          [View More]                         │
└─────────────────────────────────────────────┘
```

### No other files affected
- Landing page `Announcements.tsx` is unchanged (separate component)
- View More/View Less for the announcements list (show 3, expand all) remains unchanged


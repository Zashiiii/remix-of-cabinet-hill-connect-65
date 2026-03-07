

## Plan: Haptic Animation + Browser Testing + PWA Offline Support

### 1. Haptic-like Swipe Animation (`src/pages/resident/Dashboard.tsx`)

Add a visual "bounce" feedback when swiping between tabs:
- Add a `swipeDirection` state (`"left" | "right" | null`) that gets set on successful swipe in `handleTouchEnd`
- Apply a CSS animation class to the main content area: brief translateX shift + fade (e.g., slide in from the swipe direction over 200ms)
- Clear the animation state after it completes via `setTimeout`
- Add a subtle scale pulse to the active bottom nav icon when tab changes (transition from `scale-90` to `scale-100` with a spring-like effect)

Add keyframes to `tailwind.config.ts`:
- `swipe-in-left`: translateX(20px) → 0, opacity 0.7 → 1
- `swipe-in-right`: translateX(-20px) → 0, opacity 0.7 → 1
- `tab-bounce`: scale(0.85) → scale(1.05) → scale(1)

### 2. PWA Offline Support

**Install**: `vite-plugin-pwa`

**Files to create/modify:**
- `vite.config.ts`: Add `VitePWA` plugin with `registerType: 'autoUpdate'`, runtime caching for API requests, and `navigateFallbackDenylist: [/^\/~oauth/]`
- `public/manifest.json`: App manifest with name, icons, theme color, `display: "standalone"`
- `public/pwa-192x192.png` and `public/pwa-512x512.png`: PWA icons (will use placeholder SVG-based approach or simple generated icons)
- `index.html`: Add manifest link and mobile meta tags (`apple-mobile-web-app-capable`, `theme-color`)
- `src/main.tsx`: Register service worker via `registerSW` from `virtual:pwa-register`

Runtime caching strategy:
- Supabase API calls: `NetworkFirst` with 24h cache fallback
- Static assets: `CacheFirst`
- Images: `CacheFirst` with 30-day expiry

### 3. Browser Testing

After implementation, test at 375px width:
- Navigate to resident dashboard
- Verify swipe animation visual feedback
- Verify pull-to-refresh indicator
- Check bottom navigation rendering

**Files to modify:**
- `src/pages/resident/Dashboard.tsx` (swipe animation state + classes)
- `tailwind.config.ts` (new keyframes)
- `vite.config.ts` (PWA plugin)
- `index.html` (manifest + meta tags)
- `src/main.tsx` (SW registration)
- `public/manifest.json` (new file)

**New dependency:** `vite-plugin-pwa`


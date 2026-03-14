

## Plan: Auto-Translate Announcements (English → Tagalog)

### Overview
Add an "Auto-translate to Tagalog" button in the staff announcement creation/edit form. When clicked, it sends the English title and content to a backend function that uses Lovable AI to translate them, then populates the Tagalog fields automatically. Staff can still edit the translation before saving.

### Changes

**1. New backend function: `supabase/functions/translate-to-tagalog/index.ts`**
- Accepts `{ title, content }` in the request body
- Calls Lovable AI (google/gemini-3-flash-preview) with a system prompt instructing natural Filipino/Tagalog translation
- Returns `{ title_tl, content_tl }`
- Handles 429/402 errors gracefully

**2. Update `supabase/config.toml`**
- Add `[functions.translate-to-tagalog]` with `verify_jwt = false`

**3. Update staff announcement form (in `src/components/staff/SettingsTab.tsx` or wherever announcements are created/edited)**
- Add a "Auto-translate to Tagalog" button next to the Tagalog fields
- On click, call the edge function with the English title/content
- Populate the Tagalog fields with the AI response
- Show loading state during translation
- Staff can review and edit before saving

### Technical Detail

Edge function prompt:
```
You are a professional translator. Translate the following English text to natural conversational Filipino/Tagalog. Keep proper nouns, dates, and numbers unchanged. Return only the translation, no explanations.
```

The function uses tool calling to extract structured output (`title_tl` and `content_tl`) from the AI response.

Frontend call:
```typescript
const { data } = await supabase.functions.invoke('translate-to-tagalog', {
  body: { title: englishTitle, content: englishContent }
});
// Set Tagalog fields: data.title_tl, data.content_tl
```


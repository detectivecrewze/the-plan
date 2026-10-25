# PRD — The Plan

The Plan is a premium done-for-you scrapbook invitation for couples. The recipient completes one final puzzle piece, scrolls through a handmade album with music, reads the invitation and rundown, letter, and photos, then accepts the invitation. An animated printer reveals a 9:16 shareable invitation PNG.

## Locked product decisions

- Couples first; recipient and sender names optional. No guest list or per-guest names.
- Cut-paper collage, stamps, handwritten notes. Pra Bono and Caveat handwriting with Comic Neue for practical details. Customer chooses one of the curated scrapbook palettes stored as `project.theme`: Burgundy Keepsake, Antique Rose, Sage Botanical, Espresso Journal, Midnight Navy, or Lavender Dusk.
- Three-piece drag-to-place photo puzzle with keyboard and tap alternative; one scrollable gift.
- Date and start time required. End time, venue, address, map, and dress code optional. Venue is revealed in the invitation when present.
- Gallery has no product count cap; render images progressively.
- One affirmative response, stored and later visible to admin/owner. No decline action.
- Printed ticket contains event details and one personal line. Download PNG 1080×1920 and use native mobile sharing with download fallback.
- Indonesian and English fixed UI copy. Customer letter starts from free-form story that team/agent polishes while preserving meaning.
- Customer music intake in Stage 4 follows Memoria: the same `src/music-playlist.json` catalog used by Studio, plus song request or team choice; team installs approved audio before publication. Keep this catalog as the single source for Studio and the future customer form.

## Release gates

1. **Gift pages:** one coherent demo with all sections, typed dynamic project data, mobile/desktop layout, puzzle, active demo player, optional-field behavior, long gallery, local demo RSVP, and tested PNG share/download. Owner reviews and approves visuals before Stage 2.
2. **Studio:** internal editor for the same schema, autosaved draft, preview via the actual gift renderer, explicit publish, English/Indonesian controls, text presets by content section, and a ready-to-use music playlist with an upload option. Implemented locally; production deployment is a separate approval. The gallery asks for a caption only and reuses it as accessible image text.
3. **Dashboard:** create projects manually, copy form links, view detailed incoming orders and RSVP, manage statuses and completed-order history, launch Studio, review and publish final links. Implemented locally at `/admin`; production deployment is a separate approval.
4. **Customer form:** concise intake with a separate Indonesian/English form-language switch and Bahasa Indonesia, Indoglish, or Full English gift-content choice; no redundant email/WhatsApp fields; sender, recipient and nickname; one unified Letter field with expand-or-keep instruction and multiple writing-style choices; autosave; optional desired completion deadline; token-protected links; R2 photo/video/song uploads; palette and playlist, song request, upload, or team-choice music; section-targeted previews of the finished public example gift; a mobile-safe review screen; and a success screen with a prepared WhatsApp message to the team. Manual orders create the project and form link instantly. Submission persists immutable raw answers in KV and automatically applies every directly mappable answer and media item to the Studio draft, while the dashboard shows the language, deadline, raw Letter text, writing styles, event details, media, and auto-apply status. Implemented locally. Connecting the existing storefront payment webhook to this same order-creation contract is the remaining launch-integration task.

## Data contract and infrastructure

`GiftProject` in `src/project.ts` is the shared content contract. Theme definitions live in `src/themes.ts`; forms and Studio store a theme ID rather than raw colors. The root route uses demo data; `/gift/:id` loads published data from the Cloudflare Worker. `order:{orderId}` stores the operational order plus the immutable submitted answers; `form-access:{projectId}` stores its private form token mapping; `form-draft:{projectId}` stores autosaved intake; `draft:{projectId}` stores internal editing state; `gift:{projectId}` stores the approved published gift; and `response:{projectId}` stores the recipient's affirmative answer. Media is isolated in R2 at `the-plan/{projectId}/`. Static frontend uses Vite and TypeScript; the API uses Worker. Deployed frontend can follow the existing Vercel static pattern.

# PRD — The Plan

The Plan is a premium done-for-you scrapbook invitation for couples. The recipient completes one final puzzle piece, scrolls through a handmade album with music, reads the invitation and rundown, letter, and photos, then accepts the invitation. An animated printer reveals a 9:16 shareable invitation PNG.

## Locked product decisions

- Couples first; recipient and sender names optional. No guest list or per-guest names.
- Cut-paper collage, stamps, handwritten notes. Kalam headlines, Caveat letter and annotations, legible sans for practical details. Customer chooses one of the curated scrapbook palettes stored as `project.theme`: Burgundy Keepsake, Antique Rose, Sage Botanical, Espresso Journal, Midnight Navy, or Lavender Dusk.
- Three-piece drag-to-place photo puzzle with keyboard and tap alternative; one scrollable gift.
- Date and start time required. End time, venue, address, map, and dress code optional. Venue is revealed in the invitation when present.
- Gallery has no product count cap; render images progressively.
- One affirmative response, stored and later visible to admin/owner. No decline action.
- Printed ticket contains event details and one personal line. Download PNG 1080×1920 and use native mobile sharing with download fallback.
- Indonesian and English fixed UI copy. Customer letter starts from free-form story that team/agent polishes while preserving meaning.
- Customer music intake in Stage 4 follows Memoria: playlist, song request, or team choice; team installs approved audio before publication.

## Release gates

1. **Gift pages:** one coherent demo with all sections, typed dynamic project data, mobile/desktop layout, puzzle, active demo player, optional-field behavior, long gallery, local demo RSVP, and tested PNG share/download. Owner reviews and approves visuals before Stage 2.
2. **Studio:** internal editor for the same schema, autosaved draft, preview via the actual gift renderer, explicit publish, and English/Indonesian controls.
3. **Dashboard:** create projects manually, copy form links, view detailed incoming orders and RSVP, manage statuses, launch Studio, review and publish final links.
4. **Customer form:** concise intake with uploads; manual and payment webhook paths create the same project and form link. Incoming form order is persisted in KV and shown in dashboard. Only then integrate storefront and release.

## Data contract and infrastructure

`GiftProject` in `src/project.ts` is the shared content contract. Theme definitions live in `src/themes.ts`; forms and Studio must store a theme ID rather than raw colors. Stage 1 uses demo data; subsequent stages supply it from a Cloudflare Worker. `order:{orderId}` stores raw form responses, `draft:{projectId}` stores internal editing state, `gift:{projectId}` stores published gift. Media is isolated in R2 at `the-plan/{projectId}/`. Static frontend uses Vite and TypeScript; the API uses Worker. Deployed frontend can follow the existing Vercel static pattern.

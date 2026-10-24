# The Plan

Premium handmade scrapbook invitation. This repository currently implements **Stage 1: the public gift demo only**. Studio, dashboard, customer form, payment integration, and the production response API are future stages and are intentionally absent.

## Run

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. Run `npm run check` for contract tests, TypeScript, and a production build.

The demo content is in `src/demo.ts` and `src/demoEnglish.ts`. Locale is project data selected by the future customer form; the public gift intentionally has no language switch. The UI consumes the typed `GiftProject` contract from `src/project.ts`; later a Worker adapter can return this same shape. Gallery stamps accept images and playable videos (`type: "video"`, optional `poster`) with inline mobile playback. The printed PNG is drawn at 1080×1920 in `src/ticket.ts`, independent of screenshots and remote photos. The original demo audio is in `public/demo-soundtrack.wav`.

Color is also project data. The six curated palette IDs live in `src/themes.ts`, recolor the complete gift and exported ticket, and will be selected from the future form/Studio rather than the recipient gift. During local Stage 1 review only, preview them with `?theme=burgundy-keepsake`, `antique-rose`, `sage-botanical`, `espresso-journal`, `midnight-navy`, or `lavender-dusk`. The query override is ignored outside localhost.

RSVP is stored in browser `localStorage` during Stage 1 (`src/response.ts`). It is only a local demo and is **not visible to the sender or admin yet**. Stage 3 replaces this adapter with a Worker endpoint and protected response view. Customer media and live order data are not used in the demo. Placeholder photos are remote Unsplash examples; later stages upload customer photos to R2.

## Planned operational flow

Manual: paid order → internal project/form link → customer form → incoming order → AI agent reads order KV and media → draft in Studio → owner review → publish.

Webhook: payment confirmation creates the project/form link and emails it → same intake and production flow.

KV keys: `order:{orderId}`, `draft:{projectId}`, `gift:{projectId}`. Media goes under `the-plan/{projectId}/` in the shared R2 bucket. See `AGENTS.md` for agent rules and `PRD.md` for acceptance gates.

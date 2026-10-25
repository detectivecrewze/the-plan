# The Plan

Premium handmade scrapbook invitation. Gift pages, internal Studio, production dashboard, persistent recipient RSVP, bilingual customer intake form, and the storefront payment-to-form bridge are implemented. The latest dashboard additions—safe form re-apply, personal slug, optional custom domain, and reusable WhatsApp review copy—must still be deployed together with the matching Worker before they are available in production.

## Run

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` for the demo. Run `npm run check` for contract tests, TypeScript, Worker typecheck, and a production build.

## Internal Studio (Stage 2)

Copy `.dev.vars.example` to `.dev.vars`, set a private `STUDIO_PASSWORD` and long random `SESSION_SECRET`, then run `npm run dev:worker` alongside `npm run dev`. Open `/studio`; create a project from the example or enter an existing project ID. If Vite chooses another port, add it to `ALLOWED_ORIGIN` and update `FRONTEND_ORIGIN` in `.dev.vars`, then restart Wrangler. Local KV and R2 data reside in `.wrangler/`.

The Studio has Indonesian and English UI, all `GiftProject` text fields, six themes, reorderable rundown and gallery, image/video/audio upload to R2, autosave, Next/Previous navigation, section-targeted preview, and explicit publish. The optional end-time field accepts `HH:mm` or `END`; an empty end time displays `END` in the invitation and exported ticket. After publish, a palette-matched, scannable QR stamp can be downloaded as PNG. The same panel copies the gift link and customer review message. Drafts live at `draft:{projectId}`; publication copies a validated snapshot to `gift:{projectId}`. Later draft edits do not affect `/gift/{projectId}` until republished, and the QR stamp uses the last published palette. The Studio session is an eight-hour signed Bearer token in `sessionStorage`; the password and signing secret stay in Worker environment variables.

The Stage 3 dashboard is available at `/admin` and shares Studio's authenticated session. It lists incoming and completed orders, project status, published links, and recipient RSVP; it can create a manual order and matching draft, copy its token-protected customer-form link, open the linked Studio, update production status and internal notes, re-apply submitted form answers to the draft, rename the project slug, connect an optional custom hostname, and copy the customer-review WhatsApp template. Dashboard endpoints are `GET /api/internal/dashboard`, `POST /api/internal/orders`, `PUT /api/internal/orders/:orderId`, `POST /api/internal/orders/:orderId/apply`, and `PUT /api/internal/projects/:projectId/identity`, alongside the existing Studio endpoints. `GET /api/public/gifts/:id` exposes published project data only; `GET /api/public/domains/:hostname` resolves a configured custom domain; `POST /api/public/responses/:id` records one affirmative answer only for an existing published gift. For a separately hosted Worker, set `VITE_API_BASE_URL` during the frontend build. Never put passwords in `VITE_` variables.

## Customer Form (Stage 4)

Clicking **Order baru** in `/admin` immediately generates a project, Order ID, private form token, and draft—there are no customer fields in the admin creation flow. The result modal can copy or open `/form/{projectId}?token=...`. The form deliberately does not ask for email or WhatsApp. It collects sender, recipient plus nickname, occasion, factual date-plan details, raw rundown, one unified Letter text, whether the team may expand that text, writing tone, palette, playlist/request/team-choice music, featured puzzle photo, and gallery media.

The form UI can be switched independently between Indonesian and English. Gift content choices are Bahasa Indonesia, Indoglish, and Full English. Full English selects English fixed gift controls; the other two use Indonesian controls while preserving the requested writing style for the team. Every step can open the finished public example at `https://plan.for-you-always.my.id/` and jump to the relevant section. It does not preview a partially edited customer gift. The form saves locally and to `form-draft:{projectId}`, compresses large images before upload, stores photo/video/audio media in R2, validates factual requirements, and shows a mobile-safe review with an optional deadline before submit. Music may be selected from the playlist, requested by title, uploaded by the customer, or chosen by the team. After submission, the customer may tap the prepared WhatsApp link to notify the same team number used by Memoria; the form does not send a WhatsApp message automatically. Submission preserves raw answers in `order:{orderId}`, changes status to `ready_to_craft`, and automatically applies recipient/sender, event facts, rundown, Letter paragraphs, theme, selected or uploaded song, featured photo, and gallery media to `draft:{projectId}`. Dashboard Order Details explicitly shows the content language, deadline, raw Letter text, writing styles, music, media, and prefilled draft status. **Terapkan ulang ke Draft** deliberately overwrites only the fields owned by the form mapping, so use it before final copy-polishing or after intentionally restoring the customer's original answers. The private token is sent only through `X-Form-Token` to `GET/PUT /api/public/forms/:id`, `POST /api/public/forms/:id/media`, and `POST /api/public/forms/:id/submit`; it is not returned by public responses.

## Personal links and custom domains

Use **Link & domain** in `/admin` after the customer has submitted the form. Renaming the project migrates its draft, published gift, form state, RSVP, metadata, and linked dashboard order to the new ID. The standard public URL becomes `/gift/{new-project-id}`. A custom hostname is optional: add the exact hostname to the Vercel project first, then save that same hostname in the dashboard. The hostname root resolves to the published gift through `domain:{hostname}`. Removing or replacing a hostname also removes its old KV mapping. Existing R2 object URLs remain valid after a rename; new uploads use the new project prefix.

The demo content, including soundtrack and cover URLs, is in `src/demo.ts` and `src/demoEnglish.ts`. Locale is project data set in Studio and later in the customer form; the public gift intentionally has no language switch. The UI consumes the typed `GiftProject` contract from `src/project.ts`, with `/gift/:id` loading published data from the Worker. Gallery stamps accept images and playable videos (`type: "video"`, optional `poster`) with inline mobile playback. The printed PNG is drawn at 1080×1920 in `src/ticket.ts`, independent of screenshots and remote photos.

On small or touch-first screens, completing the puzzle reveals an inline `Lanjut ke ceritanya` continuation card. Its explicit tap starts the soundtrack before opening the gift, satisfying iOS audio gesture requirements without exposing a technical music prompt. If playback genuinely fails, retry and silent-entry controls appear; desktop keeps the immediate opening flow.

Color is also project data. The six curated palette IDs live in `src/themes.ts`, recolor the complete gift and exported ticket, and are selected in Studio or the customer form. Preview them with `?theme=burgundy-keepsake`, `antique-rose`, `sage-botanical`, `espresso-journal`, `midnight-navy`, or `lavender-dusk` on localhost or the dedicated `the-plan-iota.vercel.app` demo root. Published `/gift/:id` pages and custom gift domains always use the theme saved in project data and ignore this demo override.

On a published `/gift/:id`, RSVP is stored idempotently at `response:{projectId}` through the Worker and becomes visible in the protected dashboard. The root demo keeps a local-only response so development data does not pollute KV. Studio uploads customer media to R2.

## Planned operational flow

Manual: paid order → click Order baru → copy private form link → customer submits form → incoming order becomes ready and its Studio draft is prefilled → AI agent reads raw order KV and media, then polishes the draft → owner review → publish.

Webhook: payment confirmation creates the project/form link and emails it → same intake and production flow.

KV keys: `order:{orderId}`, `form-access:{projectId}`, `form-draft:{projectId}`, `draft:{projectId}`, `gift:{projectId}`, and `response:{projectId}`. Media goes under `the-plan/{projectId}/` in the shared R2 bucket. See `AGENTS.md` for agent rules and `PRD.md` for acceptance gates.

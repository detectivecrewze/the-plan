# The Plan — agent working rules

The product is a premium made-for-you scrapbook invitation. Work in the approved stage only. Stage 1 is the public gift demo; do not build Studio, dashboard, form, or payment integration until the owner approves the gift experience.

Read `PRD.md`, `src/project.ts`, and `README.md` before changing code. Keep copy and media in project data, not hardcoded in rendering components. Preserve Indonesian and English UI copy parity. Validate data at boundaries. Keep sections modular and avoid large all-purpose files when expanding the product.

Keep all palette definitions in `src/themes.ts`. Store only a supported theme ID on the project; never duplicate raw palette colors inside orders, drafts, or gifts. The recipient gift must not expose a theme switch. Theme choice belongs in the future customer form and internal Studio.

When customer orders exist in later stages, obtain the real KV project ID and order ID first. Read `order:{orderId}` before producing any copy or selecting media. Use only customer-uploaded R2 URLs and explicit customer facts for date, time, venue, Maps, photos, and music choice. Do not invent missing factual details. Store editable draft at `draft:{projectId}` and only approved published data at `gift:{projectId}`. A draft edit must never change a published gift until the owner publishes it.

Manual payment and webhook payment must converge on the same form → incoming order → agent application → owner review → publish workflow. Keep raw customer answers intact for audit, and write polished gift content into the draft. Do not claim Stage 1 local RSVP storage is production persistence.

Run `npm run check` for code changes. Inspect mobile and desktop rendering and the exported 1080×1920 PNG. Never push or deploy without the owner's current instruction.

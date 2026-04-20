## Plan: Walk-in Guests

Build a public walk-in guest intake flow and matching dashboard guest management module by reusing the existing auth-shell styling, image uploader, client CRUD/table patterns, and Supabase migration conventions. The recommended approach is: add a dedicated public slug on business units, create a portable `guests` table plus optional guest-photo storage support, implement a public `/walk-in-guest/[slug]` submission route with strong validation, and add a dashboard guest list with search, filters, details, edit, and delete.

**Steps**
1. Phase 1 — Data model and routing contract.
   Decide the canonical route as `/walk-in-guest/[slug]` backed by a new business-unit field such as `public_guest_form_slug` so anonymous submissions can resolve a writable destination without exposing dashboard state or relying on the active-business-unit cookie.
2. Phase 1 — Extend business-unit access helpers.
   Add a helper that resolves a public guest-form slug to a business unit for anonymous page rendering and submission, while keeping normal dashboard business-unit scope on existing authenticated pages. This blocks all later public-form work.
3. Phase 1 — Define portable guest domain types.
   Add a dedicated guest schema and types with explicit fields for first name, last name, phone, email, birthday, gender, nationality, emergency contact, identification type, identification number, identification image URL, business unit, archive state, metadata, and timestamps. Keep the structure PMS-friendly by avoiding invoice-specific assumptions and preserving `metadata` for future hotel/PMS fields.
4. Phase 1 — Add Supabase migration(s).
   Create a migration that adds the business-unit public slug, creates `public.guests`, adds indexes and uniqueness checks where appropriate, enables RLS, adds owner/member read policies aligned with current business-unit membership logic, and adds an `updated_at` trigger pattern if the repo uses one elsewhere. If image persistence is required beyond transient previews, add a guest-photo storage bucket/policies in the same migration set or a follow-up migration.
5. Phase 2 — Public walk-in form UX.
   Build the public guest page as a polished marketing-style form using the existing visual language from auth pages: warm gradients, glass card treatment, strong hierarchy, and mobile-safe spacing. Reuse the existing image uploader for identification capture, and keep the page accessible without auth because `/walk-in-guest` is already outside middleware matching.
6. Phase 2 — Public validation and submission.
   Implement client-side validation with the shared guest schema (React Hook Form + Zod resolver is the best fit given current dependencies), plus a server-side submission path that re-validates, resolves the slug to a business unit, uploads the identification image if present, inserts the guest row, and returns structured field/global errors for UI feedback.
7. Phase 2 — Post-submit behavior.
   Define a success state on the public form rather than redirecting into the dashboard: clear confirmation, optional reference details, and a reset path to capture another guest. This is parallel with step 6 once the submission contract exists.
8. Phase 3 — Dashboard guest list page.
   Implement the dashboard list page using the clients page as the main template: fetch guests for the active business unit scope, show an empty state, and render a client-side table shell with search, pagination, and filters for gender, means of identification, and business unit.
9. Phase 3 — Guest details and row actions.
   Add row actions for view, edit, and delete. Reuse the existing delete modal and toast patterns. Provide a details surface (drawer/dialog or dedicated detail page) that shows the captured identification image and full guest profile. This depends on the list data shape being complete enough for detail rendering.
10. Phase 3 — Dashboard create/edit parity.
    Add a shared guest form for dashboard create/edit so internal users can manage the same field set as the public form, including image upload and identification metadata. Reuse the client form structure and business-unit selector, but constrain editing to manageable business units only.
11. Phase 3 — CRUD endpoints/actions.
    Add read helpers plus create/update/delete handlers that mirror the existing clients patterns: a `lib/supabase` read layer, dashboard POST route, dashboard `[id]` PUT/DELETE route, and/or server actions where they improve ergonomics. Public submission should remain separate from authenticated dashboard CRUD.
12. Phase 4 — Integration and polish.
    Ensure navigation, labels, and empty states are consistent with the existing sidebar entry for Guest List. If useful, surface the public guest-form link from business-unit management later, but keep that out of the initial scope unless requested.
13. Phase 4 — Verification.
    Validate anonymous submission, authenticated CRUD, image upload behavior, search/filter correctness, RLS access rules for owners vs shared viewers, and regression safety for the untouched clients/invoices flows.

**Relevant files**
- `/Users/user/Desktop/projects/invoice-manager/app/walk-in-guest/page.tsx` — currently empty; replace with the public intake experience or convert into a route-group/redirect entry if moving to a slug route.
- `/Users/user/Desktop/projects/invoice-manager/middleware.ts` — confirms walk-in guest remains public; verify matcher does not accidentally start protecting the new slug route.
- `/Users/user/Desktop/projects/invoice-manager/app/(auth)/layout.tsx` — visual reference for the warm premium public-page treatment.
- `/Users/user/Desktop/projects/invoice-manager/app/(auth)/_components/auth-form-shell.tsx` — reusable shell pattern for the form card.
- `/Users/user/Desktop/projects/invoice-manager/components/custom/image-upload.tsx` — required uploader with camera capture support.
- `/Users/user/Desktop/projects/invoice-manager/components/custom/search-input.tsx` — reuse for dashboard list search.
- `/Users/user/Desktop/projects/invoice-manager/components/custom/DeleteModal.tsx` — reuse for guest deletion confirmation.
- `/Users/user/Desktop/projects/invoice-manager/components/custom/table-pagination.tsx` — reuse for dashboard pagination.
- `/Users/user/Desktop/projects/invoice-manager/components/app-sidebar.tsx` — already contains Guest List navigation; verify labels/routes remain aligned.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/page.tsx` — primary template for guest list page structure and empty state.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/_components/clients-client.tsx` — primary template for searchable/filterable/paginated table behavior.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/_components/client-form.tsx` — primary template for dashboard guest create/edit form structure.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/api/route.ts` — template for authenticated create endpoint shape.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/[id]/api/route.ts` — template for authenticated update/delete endpoint shape.
- `/Users/user/Desktop/projects/invoice-manager/app/dashboard/clients/actions.ts` — template for structured server-action validation and redirects.
- `/Users/user/Desktop/projects/invoice-manager/lib/business-unit-scope.ts` — authenticated active-business-unit scope; do not reuse for anonymous public submissions.
- `/Users/user/Desktop/projects/invoice-manager/lib/supabase/business-units.ts` — extend with public slug lookup helper and continue using access-aware business-unit reads for dashboard pages.
- `/Users/user/Desktop/projects/invoice-manager/lib/supabase/clients.ts` — template for the new guests read helper file.
- `/Users/user/Desktop/projects/invoice-manager/lib/types/invoice.ts` — current home of shared Zod schemas/types; likely place to add guest types unless the implementation splits them into a new domain file.
- `/Users/user/Desktop/projects/invoice-manager/supabase/migrations/001_invoice_platform.sql` — canonical schema style for entity tables and base RLS policies.
- `/Users/user/Desktop/projects/invoice-manager/supabase/migrations/004_business_unit_memberships.sql` — canonical shared-access/member policy pattern that guest reads should follow.

**Verification**
1. Run lint/typecheck for the affected app after implementation and fix any schema/type drift caused by the new guest domain.
2. Manually test anonymous submission at a valid `/walk-in-guest/[slug]` URL: required-field errors, invalid email/phone handling, birthday optionality, camera/image capture, and success state.
3. Manually test invalid/unknown slug behavior to ensure no guest can be submitted without a resolvable business unit.
4. Manually test dashboard list behavior for an owner: search, gender filter, identification filter, business-unit filter, details view, edit, and delete.
5. Manually test dashboard list behavior for a shared viewer account to confirm read access but blocked write actions where business-unit permissions are view-only.
6. Validate Supabase policies with authenticated and anonymous flows: anonymous public submission should only work through the intended server path, while direct table access remains protected by RLS.
7. If storage is added, verify upload paths, replacement cleanup behavior, and that stored identification images render correctly in both public success/details and dashboard detail/edit views.

**Decisions**
- Included: public guest form, full guest CRUD in dashboard, list/table filters for gender + means of identification + business unit, means-of-identification column, image capture via existing uploader, portable Supabase schema.
- Included: dedicated public slug on business units and a slug-based public route.
- Included: identification type + identification number + uploaded identification image.
- Excluded for now: QR codes, guest check-in/check-out workflow, room assignment, guest status pipeline, bulk import/export, and PMS sync jobs.
- Recommendation: prefer soft-delete (`is_archived`) for guests if auditability matters; if the user explicitly wants hard delete only, the UI can still expose Delete while the backend archives by default. This should be finalized during implementation.

**Further Considerations**
1. Public route shape recommendation: use `/walk-in-guest/[slug]` instead of query params because it produces cleaner links and maps directly to the new business-unit public slug.
2. Type placement recommendation: if `lib/types/invoice.ts` is getting crowded, split guest types into a dedicated guest domain file during implementation, but only if that does not create avoidable churn.
3. Storage recommendation: if the PMS migration path matters, keep guest identification images in a dedicated bucket and store only URLs/paths in the `guests` table so the data model stays portable across projects.
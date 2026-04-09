 ## Plan: Multi-BU Invoice Platform Roadmap

Build a single invoice system where business units are configurable entities (not fixed enums), so IT, real estate, finance, hotel management, sales, and future units all work via the same model. Implement in phased slices: data foundation first, then template/preview pipeline, then operations (status, numbering, PDF, dashboard), with clear verification at each phase.

**Steps**
1. Phase 1 - Domain and persistence foundation.
2. Define normalized entities and relationships: business_units, business_unit_branding, business_unit_billing_profiles, clients, invoices, invoice_items, invoice_status_history, invoice_sequences, and invoice_templates.
3. Set business unit strategy as open-ended taxonomy (name + optional category + metadata JSON), explicitly avoiding hardcoded lists like IT/real-estate-only.
4. Add multi-tenant controls using user-membership mapping and row-level security scoped to permitted business unit IDs. *blocks phases 2-5*
5. Design invoice numbering service per business unit (format rules, yearly reset behavior, and collision-safe increment transaction). *depends on step 4*
6. Phase 2 - Template engine and rendering contract.
7. Create a template variable contract that maps server data to render tokens (business, client, invoice header, line items, totals, legal/footer blocks).
8. Support per-business-unit visual overrides (logo, color palette, tax label, footer legal text, bank details) while keeping one shared base invoice layout.
9. Build deterministic preview payload transformation (same payload used by live preview and PDF export) to avoid preview-vs-PDF drift. *depends on step 7*
10. Define extension points for vertical-specific needs (finance references, hotel stay metadata, real-estate unit details) using optional structured metadata sections. *parallel with step 8*
11. Phase 3 - Product feature slices.
12. Implement Business Unit Manager CRUD (create/edit archive, default settings, branding, payment details).
13. Implement Client Directory CRUD scoped by selected business unit, including quick-select for invoice builder.
14. Implement Invoice Builder with line-item editor, subtotal/discount/tax calculations, and live template preview. *depends on steps 9, 12, 13*
15. Implement PDF export pipeline using the same render payload as preview; add downloadable and print-ready outputs. *depends on step 14*
16. Implement invoice lifecycle actions and automation: Draft -> Sent -> Paid -> Overdue, plus overdue detection job and status history logging. *depends on step 14*
17. Implement dashboard modules: revenue, outstanding balances, status distribution, and business-unit switcher with aggregate and per-unit views. *depends on step 16*
18. Phase 4 - UX and navigation integration.
19. Add primary navigation entries for Business Units, Clients, Invoices, and Reports using existing sidebar patterns.
20. Add page-level help/info icon + modal on each new dashboard page, with page purpose and links to dependent pages.
21. Preserve fast transitions and low-latency interactions by using optimistic updates/skeletons where safe and minimal blocking animations.
22. Phase 5 - Hardening and rollout.
23. Add validation schemas for all write paths, input sanitization, and server-side recalculation of monetary totals.
24. Add observability hooks (action success/failure, PDF generation errors, numbering anomalies).
25. Backfill demo seed data for multiple business units (IT, real estate, finance, hotel management, sales) to validate flexibility and showcase non-limited design.
26. Prepare migration and release checklist (schema migration order, policy deployment, rollback strategy, smoke tests).

**Relevant files**
- lib/supabase/server.ts - reuse SSR client pattern for protected server reads.
- lib/supabase/action.ts - reuse server action client pattern for invoice/business-unit mutations.
- lib/supabase/middleware.ts - keep session continuity for protected invoice routes.
- lib/redirect/redirectIfNotAuthenticated.ts - gate all new management pages.
- components/app-sidebar.tsx - add invoice platform navigation groups.
- components/site-header.tsx - add per-page help icon trigger integration.
- components/data-table.tsx - reuse table patterns for client and invoice listings.
- components/custom/DeleteModal.tsx - reuse modal interaction pattern for destructive actions.
- lib/toast.ts - reuse success/error feedback conventions.
- app/dashboard/page.tsx - adapt dashboard composition style for finance metrics views.
- app/dashboard/layout.tsx - align new dashboard sub-pages with existing structure.
- middleware.ts - verify route protection behavior for new sections.
- docs/milestone.md - milestone tracker in docs.
- docs/implementation.md - full implementation plan.

**Verification**
1. Data model verification: run migration checks and confirm all entities support multiple arbitrary business-unit names/categories without code changes.
2. Access control verification: test with two users across multiple business units and confirm strict data isolation by policies.
3. Numbering verification: create concurrent invoices in the same business unit and confirm unique, monotonic sequence formatting.
4. Template verification: for at least 5 business-unit profiles (IT, real estate, finance, hotel management, sales), confirm branding/footer/tax-label substitutions render correctly in preview and PDF.
5. Calculation verification: assert totals server-side against manipulated client payloads (unit tests + integration tests).
6. Workflow verification: execute Draft -> Sent -> Paid and overdue transition scenarios, including status history logs.
7. UX verification: validate each new page includes help/info modal with dependency links and acceptable mobile/desktop layout behavior.
8. Performance verification: measure invoice form interaction latency and page transition responsiveness against baseline dashboard behavior.

**Decisions**
- Business units are modeled as records, not enums; this explicitly includes IT/real estate/finance/hotel management/sales and any future unit.
- One shared template engine with per-unit branding/legal/tax overrides is preferred over separate hardcoded templates per industry.
- Preview and PDF must share one payload contract to prevent divergent outputs.
- Included scope: architecture, data model, feature sequencing, and delivery milestones.
- Excluded scope: accounting integrations (e.g., ERP sync), multilingual invoice localization, and payment gateway settlement workflows in v1.

**Further Considerations**
1. Invoice numbering format recommendation: `<BU-CODE>-<YYYY>-<SEQ>` with per-unit sequence reset each year.
2. Metadata strategy recommendation: `metadata` JSON column per invoice/business unit for vertical extras before introducing specialized tables.
3. Dashboard default recommendation: land on current user’s last-used business unit, with optional cross-unit aggregate toggle.
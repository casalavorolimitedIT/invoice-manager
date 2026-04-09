## Milestones: Multi-Business-Unit Invoice Manager

This milestone tracker assumes phased delivery with verification gates and supports unlimited business-unit types (including IT, real estate, finance, hotel management, sales, and future units).

### M1 - Data Model and Access Control Foundation
- Outcome: Core schema and security model are production-safe.
- Deliverables:
- business_units, clients, invoices, invoice_items, invoice_sequences, invoice_templates tables.
- Membership + RLS policies for multi-unit access.
- Numbering service design and transactional sequence logic.
- Exit criteria:
- Can create/read data for multiple business units.
- No cross-unit data leakage under auth tests.
- Risks:
- RLS misconfiguration; race conditions in sequence generation.

### M2 - Template Contract and Live Preview Backbone
- Outcome: One template system supports all business units with overrides.
- Deliverables:
- Variable mapping contract (business, client, invoice, line items, totals).
- Shared render payload used by preview and PDF.
- Per-unit branding, legal footer, tax label, and bank detail overrides.
- Exit criteria:
- Five sample business units render correctly with distinct branding.
- Preview output parity checks pass against PDF payload snapshots.
- Risks:
- Token drift between UI preview and PDF service.

### M3 - Core CRUD Features (Business Units, Clients, Invoices)
- Outcome: Users can manage operational invoice data end-to-end.
- Deliverables:
- Business Unit Manager CRUD.
- Client Directory CRUD and invoice quick-select.
- Invoice Builder with line items, totals, discount/tax handling.
- Exit criteria:
- User can create invoice from start to save with valid totals.
- Data persists and reloads correctly per selected unit.
- Risks:
- Form complexity and validation edge cases.

### M4 - Invoice Operations (PDF, Status Flow, Overdue)
- Outcome: Invoices are distributable and lifecycle-managed.
- Deliverables:
- PDF export/download pipeline.
- Status transitions Draft -> Sent -> Paid -> Overdue.
- Status history logging and overdue detection job.
- Exit criteria:
- Generated PDFs are consistent with preview.
- Lifecycle actions update state and timeline reliably.
- Risks:
- PDF formatting regressions; cron/scheduled job drift.

### M5 - Dashboard, Navigation, and UX Completion
- Outcome: Finance visibility and polished workflow in dashboard.
- Deliverables:
- Invoice analytics cards/charts and outstanding balances views.
- Business-unit switcher + optional cross-unit aggregate mode.
- Help/info modal on each new dashboard page with dependency links.
- Exit criteria:
- Metrics match underlying invoice data.
- New pages are responsive and maintain fast perceived performance.
- Risks:
- Aggregation query cost; UX inconsistency across pages.

### M6 - Hardening, QA, and Release Readiness
- Outcome: Reliable rollout package with rollback confidence.
- Deliverables:
- Validation hardening and server-side amount recalculation.
- End-to-end smoke suite for multi-unit invoice lifecycle.
- Migration/release checklist and rollback plan.
- Exit criteria:
- Critical-path tests pass.
- Release checklist signed off with fallback documented.
- Risks:
- Migration order issues in production data.

## Suggested Timeline (Adjustable)
1. Week 1: M1
2. Week 2: M2
3. Week 3: M3
4. Week 4: M4
5. Week 5: M5
6. Week 6: M6

## Parallelization Notes
- M2 can begin once M1 schema contract is stable.
- M5 chart/UI work can partially run in parallel with late M4 if API contracts are frozen.
- M6 test authoring can start during M4 to reduce end-stage compression.
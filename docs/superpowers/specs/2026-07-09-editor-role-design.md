# Business Unit Editor Role — Design

## Problem

`business_unit_members.role` today only supports `'owner'` and `'viewer'`.
Owner grants full write access to invoices, clients, guests, and business-unit
management (including deletion and transferring ownership). Viewer is
strictly read-only. There is no way to give someone real day-to-day access
(create/edit invoices, clients, guests) without also handing them the keys
to delete the business unit, manage other members, or take over ownership.

A real user hit this directly: they wanted to let a team member ("Ella
Sweet") create invoices, but the only role that could do that was "Owner,"
which also grants unrelated, higher-stakes powers they didn't want to give
away.

## Current state (for context)

- `business_units.user_id` (NOT NULL) is the primary owner — the only thing
  `is_business_unit_owner` checks unconditionally (plus any
  `business_unit_members` row with `role = 'owner'`, added in migration 005
  for the "shared owners" model).
- `can_manage_business_unit` = `is_business_unit_owner` and gates **all**
  writes across clients, invoices, invoice_items, invoice_status_history,
  invoice_sequences, guests (migrations 004/009), as well as business-unit
  settings/deletion and member management (migration 005).
- This business unit already has legacy "secondary owner" rows (role='owner'
  but not the primary `business_units.user_id`) — an artifact of the old
  pre-transfer-feature "Make owner" button, which promoted without demoting
  the actor. Those rows currently have full owner-level power, same as the
  primary owner, including deleting the business unit outright.

## Decision: add an "editor" role, tightly scoped to day-to-day work

`BUSINESS_UNIT_MEMBER_ROLES` becomes `['owner', 'editor', 'viewer']`. Editor
gets write access to invoices, clients, and guests — nothing else. Business
unit deletion/settings and member management (invite/remove/promote/demote)
stay exclusively owner-gated, unchanged. This was a deliberate scope call:
tightening who can delete the business unit or manage members (today, any
owner — primary or secondary — can) was considered and explicitly deferred
as a separate, unrequested hardening step.

A new function `can_edit_business_unit` sits alongside the unchanged
`can_manage_business_unit`:

```sql
CREATE OR REPLACE FUNCTION public.can_edit_business_unit(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_unit_owner(p_business_unit_id, p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.business_unit_members m
      WHERE m.business_unit_id = p_business_unit_id
        AND m.user_id = p_user_id
        AND m.role = 'editor'
    );
$$;
```

Every policy currently gated by `can_manage_business_unit` for
clients/invoices/invoice_items/invoice_status_history/invoice_sequences/guests
is redefined to use `can_edit_business_unit` instead — same bodies otherwise,
verbatim. `can_manage_business_unit` itself, and everything it gates
(business unit settings/deletion, member management), is untouched.

### Migration: `016_business_unit_editor_role.sql`

```sql
-- Allow 'editor' as a role
ALTER TABLE public.business_unit_members
  DROP CONSTRAINT IF EXISTS business_unit_members_role_check;
ALTER TABLE public.business_unit_members
  ADD CONSTRAINT business_unit_members_role_check
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- New permission function: editor OR owner
CREATE OR REPLACE FUNCTION public.can_edit_business_unit(
  p_business_unit_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_unit_owner(p_business_unit_id, p_user_id)
    OR EXISTS (
      SELECT 1 FROM public.business_unit_members m
      WHERE m.business_unit_id = p_business_unit_id
        AND m.user_id = p_user_id
        AND m.role = 'editor'
    );
$$;

-- clients
DROP POLICY IF EXISTS "clients_owner_insert" ON public.clients;
CREATE POLICY "clients_owner_insert"
  ON public.clients FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "clients_owner_update" ON public.clients;
CREATE POLICY "clients_owner_update"
  ON public.clients FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "clients_owner_delete" ON public.clients;
CREATE POLICY "clients_owner_delete"
  ON public.clients FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- invoice_sequences
DROP POLICY IF EXISTS "invoice_sequences_owner_all" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_owner_all"
  ON public.invoice_sequences FOR ALL
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

-- invoices
DROP POLICY IF EXISTS "invoices_owner_insert" ON public.invoices;
CREATE POLICY "invoices_owner_insert"
  ON public.invoices FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "invoices_owner_update" ON public.invoices;
CREATE POLICY "invoices_owner_update"
  ON public.invoices FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "invoices_owner_delete" ON public.invoices;
CREATE POLICY "invoices_owner_delete"
  ON public.invoices FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- invoice_items
DROP POLICY IF EXISTS "invoice_items_owner_insert" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_insert"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_update" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_update"
  ON public.invoice_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

DROP POLICY IF EXISTS "invoice_items_owner_delete" ON public.invoice_items;
CREATE POLICY "invoice_items_owner_delete"
  ON public.invoice_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

-- invoice_status_history
DROP POLICY IF EXISTS "invoice_status_history_owner_insert" ON public.invoice_status_history;
CREATE POLICY "invoice_status_history_owner_insert"
  ON public.invoice_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND public.can_edit_business_unit(i.business_unit_id)
    )
  );

-- guests
DROP POLICY IF EXISTS "guests_owner_insert" ON public.guests;
CREATE POLICY "guests_owner_insert"
  ON public.guests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_edit_business_unit(business_unit_id)
  );

DROP POLICY IF EXISTS "guests_owner_update" ON public.guests;
CREATE POLICY "guests_owner_update"
  ON public.guests FOR UPDATE
  USING (public.can_edit_business_unit(business_unit_id))
  WITH CHECK (public.can_edit_business_unit(business_unit_id));

DROP POLICY IF EXISTS "guests_owner_delete" ON public.guests;
CREATE POLICY "guests_owner_delete"
  ON public.guests FOR DELETE
  USING (public.can_edit_business_unit(business_unit_id));

-- guest-identifications storage bucket
DROP POLICY IF EXISTS "guest_identifications_manager_update" ON storage.objects;
DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_edit_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "guest_identifications_manager_delete" ON storage.objects;
DO $$ BEGIN
  CREATE POLICY "guest_identifications_manager_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'guest-identifications'
      AND public.can_edit_business_unit(((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Role editing: any current owner can change any OTHER member's role
-- between editor/viewer. The primary owner's own row can never be edited
-- directly (only via transfer_business_unit_ownership), and a plain
-- UPDATE can never set role = 'owner' -- that only ever happens through
-- the RPC, which bypasses RLS as SECURITY DEFINER.
DROP POLICY IF EXISTS "business_unit_members_owner_update" ON public.business_unit_members;
CREATE POLICY "business_unit_members_owner_update"
  ON public.business_unit_members FOR UPDATE
  USING (
    public.is_business_unit_owner(business_unit_id)
    AND user_id <> (
      SELECT bu.user_id FROM public.business_units bu WHERE bu.id = business_unit_id
    )
  )
  WITH CHECK (
    public.is_business_unit_owner(business_unit_id)
    AND role IN ('editor', 'viewer')
  );

-- Sort editors between owners and viewers in the members list
CREATE OR REPLACE FUNCTION public.get_business_unit_members(p_business_unit_id UUID)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  invited_by UUID,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_business_unit_member(p_business_unit_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    m.role,
    m.invited_by,
    m.created_at,
    p.email,
    p.full_name,
    p.avatar
  FROM public.business_unit_members m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.business_unit_id = p_business_unit_id
  ORDER BY
    CASE m.role
      WHEN 'owner' THEN 0
      WHEN 'editor' THEN 1
      ELSE 2
    END,
    lower(COALESCE(p.full_name, p.email, ''));
END;
$$;
```

## Backend API

`app/dashboard/business-units/[id]/members/api/route.ts`, `PATCH` handler
restructured into a real three-way branch (replacing the old "reject
`role: viewer` as a no-op" logic, which only made sense when viewer was the
only non-owner state):

```ts
const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);
if (!businessUnit) {
  return NextResponse.json({ error: "Only a current owner can change member roles." }, { status: 403 });
}

const { data: existingMember } = await supabase
  .from("business_unit_members")
  .select("user_id, role")
  .eq("business_unit_id", id)
  .eq("user_id", result.data.memberUserId)
  .single();

if (!existingMember) {
  return NextResponse.json({ error: "Member not found." }, { status: 404 });
}

if (result.data.memberUserId === businessUnit.user_id) {
  return NextResponse.json(
    { error: "The primary owner's role can't be changed directly. Transfer ownership instead." },
    { status: 400 }
  );
}

if (result.data.role === "owner") {
  if (result.data.memberUserId === user.id) {
    return NextResponse.json({ error: "You are already the owner." }, { status: 400 });
  }
  const { error } = await supabase.rpc("transfer_business_unit_ownership", {
    p_business_unit_id: id,
    p_new_owner_id: result.data.memberUserId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// role is "editor" or "viewer" -- plain role change, no RPC needed
const { error } = await supabase
  .from("business_unit_members")
  .update({ role: result.data.role })
  .eq("business_unit_id", id)
  .eq("user_id", result.data.memberUserId);

if (error) return NextResponse.json({ error: error.message }, { status: 400 });
return NextResponse.json({ ok: true });
```

The primary-owner-row guard runs once, before branching, protecting both the
transfer path and the plain-update path. `POST` (invite) and `DELETE` are
untouched — invites stay viewer-only; removal already supports removing
owner/editor/viewer rows (shipped in migration 015).

## Frontend

`business-unit-members-panel.tsx`:

- **Primary owner row:** unchanged — plain "Owner" badge, "Owner access is
  permanent," no controls.
- **Every other row:** the Role column becomes an interactive `Select`
  (Viewer / Editor / Owner) reflecting the current role — including legacy
  secondary-owner rows, which display "Owner" as their current value like
  any other. Picking **Owner** opens the existing transfer-ownership
  confirmation dialog (same `transferTarget` state and RPC call as today —
  just triggered from the dropdown instead of a dedicated "Make owner"
  button, which is removed). Picking **Editor** or **Viewer** calls a new
  `handleRoleChange(member, role)` that PATCHes immediately, no
  confirmation (low-stakes, reversible), and toasts "Role updated."
- **Actions column** simplifies to just **Remove**. Removing someone whose
  current role is **Owner or Editor** still asks for confirmation first
  (extended from owner-only, since editors also hold real write access);
  removing a **Viewer** stays a single click.
- **Role filter** dropdown gets an "Editor" option alongside Owner/Viewer.
- Invite form is untouched — still email-only, always creates a Viewer.
  Promoting someone to Editor is a deliberate second step via the dropdown.

## Edge cases

- Legacy secondary-owner rows (Chinyere, Cynthia, Annabel) are left as-is by
  the migration. The primary owner demotes or removes them manually via the
  Role dropdown / Remove button — no forced data migration.
- A plain client `UPDATE` can never set `role = 'owner'` — the RLS `WITH
  CHECK` only allows `'editor'`/`'viewer'`. The only path to `role = 'owner'`
  is the `transfer_business_unit_ownership` RPC, which is `SECURITY DEFINER`
  and keeps `business_units.user_id` and the member row in sync atomically.
  This means no *new* secondary-owner drift can be created going forward.
- The primary owner's own row can never be edited via the plain-update path
  (RLS-blocked) or the API (explicit check before branching) — only via
  transfer, preventing the "role says viewer but `user_id` still says
  owner" desync class of bug fixed earlier this session.
- Editor and Viewer removal/demotion both go through the same "any current
  owner, except targeting the primary owner or yourself-as-primary-owner"
  boundary already established for `DELETE` in migration 015.

## Testing plan

- SQL-level check, run **before** pushing the migration: confirm the CHECK
  constraint's actual name matches the assumption baked into the migration
  (`business_unit_members_role_check`, Postgres's default name for an
  unnamed inline column CHECK):
  ```sql
  select conname, pg_get_constraintdef(oid)
  from pg_constraint
  where conrelid = 'public.business_unit_members'::regclass and contype = 'c';
  ```
  If the name differs, fix the `DROP CONSTRAINT IF EXISTS` line in the
  migration to match before pushing — otherwise it silently no-ops and the
  old `owner`/`viewer`-only constraint keeps blocking `'editor'` rows even
  after the new constraint is added.
- SQL-level check: as a business-unit owner, `UPDATE business_unit_members
  SET role = 'owner' WHERE ...` directly (bypassing the RPC) should fail the
  `WITH CHECK` clause. Promoting/demoting a non-primary row between
  `editor`/`viewer` should succeed. Attempting to `UPDATE` the primary
  owner's own row (any role) should fail via `USING`.
- SQL-level check: as an `editor`, inserting a client/invoice/guest for the
  business unit should succeed; deleting the business unit or inviting a
  member should still fail (unchanged owner-only gates).
- Manual walkthrough: promote Ella Sweet from Viewer to Editor via the
  dropdown, confirm she can create an invoice; demote her back to Viewer,
  confirm invoice creation is blocked again; demote one of the legacy
  secondary owners to Editor via the dropdown, confirm the primary owner's
  own row still shows no dropdown.

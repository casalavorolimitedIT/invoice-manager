# Business Unit Editor Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third business-unit member role, "editor," that can create/edit invoices, clients, and guests without holding business-unit deletion, ownership-transfer, or member-management power.

**Architecture:** A new `can_edit_business_unit` Postgres function (owner OR editor) replaces `can_manage_business_unit` on the write policies for clients/invoices/invoice_items/invoice_status_history/invoice_sequences/guests, while business-unit deletion/settings and member management stay on the unchanged `can_manage_business_unit` (owner-only). The members-panel PATCH endpoint gets a real three-way role branch (owner → transfer RPC, editor/viewer → plain update), and the Members table's per-row role control becomes a single dropdown.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + `@supabase/ssr`), Zod, TypeScript, Tailwind, shadcn-style UI primitives (`components/ui`).

## Global Constraints

- Full design rationale and the approved SQL live in `docs/superpowers/specs/2026-07-09-editor-role-design.md` — read it before starting if anything here is unclear.
- No automated test framework exists in this repo (no `test` script in `package.json`). Verification is `npx tsc --noEmit` for TypeScript changes; SQL checks and migration push are run manually by the human against their hosted Supabase project — this sandbox has no Supabase CLI credentials, confirmed in this repo's prior session. Do not attempt `npm run supabase:db:push` or any live SQL query.
- Business-unit deletion/settings and member management (invite/remove/promote/demote) stay exclusively gated by the existing `can_manage_business_unit` (owner-only) — this plan does not touch those policies.
- The migration must be named `supabase/migrations/016_business_unit_editor_role.sql` (next sequential number after `015_allow_removing_secondary_owners.sql`).

---

### Task 1: Add `016_business_unit_editor_role.sql` migration

**Files:**
- Create: `supabase/migrations/016_business_unit_editor_role.sql`

**Interfaces:**
- Produces: a new Postgres function `public.can_edit_business_unit(p_business_unit_id UUID, p_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN`; an updated `business_unit_members` CHECK constraint allowing `role IN ('owner', 'editor', 'viewer')`; an updated `business_unit_members_owner_update` RLS policy; an updated `get_business_unit_members` sort order. Task 2's PATCH handler and Task 3's UI both depend on `'editor'` being a valid role value once this migration is applied.
- Consumes: existing `public.is_business_unit_owner` and `public.is_business_unit_member` (from `supabase/migrations/004_business_unit_memberships.sql` / `005_shared_business_unit_owners.sql`) — unchanged, not redefined by this migration.

- [ ] **Step 1: Write the migration file**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Business Unit Editor Role
-- Adds a role between owner and viewer that can create/edit invoices,
-- clients, and guests, without business-unit deletion, ownership transfer,
-- or member-management power (all of which stay owner-only).
-- ─────────────────────────────────────────────────────────────────────────────

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

- [ ] **Step 2: Do NOT push or run this migration**

This sandbox has no Supabase CLI credentials. Do not run `npm run supabase:db:push` and do not attempt to connect to any Supabase project. Note the following in your report for the human to run themselves after this task is committed:

Before pushing, verify the CHECK constraint name assumption baked into Step 1 (`business_unit_members_role_check`) is actually correct:
```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.business_unit_members'::regclass and contype = 'c';
```
If the name differs, the `DROP CONSTRAINT IF EXISTS` line in the migration needs to be fixed to match before pushing — otherwise it silently no-ops and the old `owner`/`viewer`-only constraint keeps blocking `'editor'` rows even after the new constraint is added.

Then push with `npm run supabase:db:push`, and after pushing, confirm role editing works as designed:
```sql
-- as a business-unit owner, this should fail (WITH CHECK blocks role='owner' on a plain UPDATE):
update business_unit_members set role = 'owner' where business_unit_id = '<bu-id>' and user_id = '<some-member-id>';

-- as a business-unit owner, this should succeed:
update business_unit_members set role = 'editor' where business_unit_id = '<bu-id>' and user_id = '<some-member-id>';

-- as a business-unit owner, this should fail (USING blocks touching the primary owner's own row):
update business_unit_members set role = 'viewer' where business_unit_id = '<bu-id>' and user_id = '<primary-owner-id>';
```

- [ ] **Step 3: Verify the SQL by careful read-through**

Re-read the file you just wrote. Confirm:
- Every `CREATE POLICY` is preceded by a matching `DROP POLICY IF EXISTS` (or, for the two storage policies, wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` with its own `DROP POLICY IF EXISTS` first).
- Every policy body that references `can_manage_business_unit` in the *old* migrations (004/009) has been transcribed here with `can_edit_business_unit` substituted in its place, and is otherwise byte-identical (same `USING`/`WITH CHECK` structure, same `auth.uid() = user_id` clauses where present).
- `can_manage_business_unit` itself does not appear anywhere in this new file — this migration only ever adds `can_edit_business_unit`, it never redefines `can_manage_business_unit`.
- Both `CREATE OR REPLACE FUNCTION` blocks (`can_edit_business_unit`, `get_business_unit_members`) have balanced `AS $$ ... $$;` and (for `get_business_unit_members`) balanced `BEGIN ... END;`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/016_business_unit_editor_role.sql
git commit -m "feat: add business unit editor role migration"
```

---

### Task 2: Type update + PATCH endpoint three-way role branch

**Files:**
- Modify: `lib/types/invoice.ts:74`
- Modify: `app/dashboard/business-units/[id]/members/api/route.ts:186-251` (the `PATCH` handler)

**Interfaces:**
- Consumes: `transfer_business_unit_ownership` RPC (unchanged, from `supabase/migrations/014_transfer_business_unit_ownership.sql`); the file's existing local `getOwnedBusinessUnit(supabase, businessUnitId, userId)` helper (`route.ts:35-56`, unchanged — already checks both `business_units.user_id` and `business_unit_members.role === "owner"`).
- Produces: `BUSINESS_UNIT_MEMBER_ROLES = ["owner", "editor", "viewer"] as const` (and the derived `BusinessUnitMemberRole` type, unchanged in shape, now with 3 members) — Task 3's UI depends on this. `PATCH /dashboard/business-units/:id/members/api` with body `{ memberUserId: string, role: "owner" | "editor" | "viewer" }` now: rejects changes to the primary owner's own row with 400; for `role: "owner"` calls the transfer RPC (unchanged behavior); for `role: "editor"` or `role: "viewer"` performs a plain `UPDATE` instead of the old "reject as no-op" behavior. This is what Task 3's `handleRoleChange` will call.

- [ ] **Step 1: Add "editor" to the role constant**

In `lib/types/invoice.ts`, change:

```ts
export const BUSINESS_UNIT_MEMBER_ROLES = ["owner", "viewer"] as const;
```

to:

```ts
export const BUSINESS_UNIT_MEMBER_ROLES = ["owner", "editor", "viewer"] as const;
```

- [ ] **Step 2: Restructure the `PATCH` handler into a three-way role branch**

In `app/dashboard/business-units/[id]/members/api/route.ts`, replace the entire body of the `PATCH` function (everything between `export async function PATCH(...) {` and its closing `}`) with:

```ts
  const { id } = await params;
  const { supabase, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const result = updateBusinessUnitMemberSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid role update payload" },
      { status: 400 }
    );
  }

  const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);

  if (!businessUnit) {
    return NextResponse.json(
      { error: "Only a current owner can change member roles." },
      { status: 403 }
    );
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
      return NextResponse.json(
        { error: "You are already the owner." },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("transfer_business_unit_ownership", {
      p_business_unit_id: id,
      p_new_owner_id: result.data.memberUserId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("business_unit_members")
    .update({ role: result.data.role })
    .eq("business_unit_id", id)
    .eq("user_id", result.data.memberUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
```

Do not touch the `POST` or `DELETE` handlers, or the local `getOwnedBusinessUnit` helper — all unchanged and out of scope for this task.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/types/invoice.ts` or `route.ts`.

- [ ] **Step 4: Manual verification**

This depends on migration 016 being pushed to the hosted database first (Task 1 explicitly deferred that to the human) — if it hasn't been pushed yet, skip this step and note it in your report; do not attempt to push it yourself. If it has been pushed, from the browser devtools console on the members page for a business unit you own, with an existing viewer member:

```js
fetch(`/dashboard/business-units/<bu-id>/members/api`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ memberUserId: "<viewer-user-id>", role: "editor" }),
}).then((r) => r.json()).then(console.log)
```

Expected: `{ ok: true }`. Then try targeting the primary owner's own row (your own user id, if you're the primary owner):

```js
fetch(`/dashboard/business-units/<bu-id>/members/api`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ memberUserId: "<your-own-user-id>", role: "viewer" }),
}).then((r) => r.json()).then(console.log)
```

Expected: `400` with `{ error: "The primary owner's role can't be changed directly. Transfer ownership instead." }`.

- [ ] **Step 5: Commit**

```bash
git add lib/types/invoice.ts app/dashboard/business-units/\[id\]/members/api/route.ts
git commit -m "feat: add editor role and three-way PATCH role branch"
```

---

### Task 3: Members panel — single role dropdown, drop Make-owner button

**Files:**
- Modify: `app/dashboard/business-units/_components/business-unit-members-panel.tsx`

**Interfaces:**
- Consumes: `BUSINESS_UNIT_MEMBER_ROLES`/`BusinessUnitMemberRole` from Task 2 (now 3 values); the `PATCH` endpoint's three-way branch from Task 2 (same request shape as today, `{ memberUserId, role }`, now with `role` legitimately `"editor"` or `"viewer"` in addition to `"owner"`).
- Produces: no new exports — `BusinessUnitMembersPanel`'s props are unchanged.

- [ ] **Step 1: Remove the now-unused `Shield01Icon` import**

Change:

```tsx
import { Delete01Icon, Shield01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
```

to:

```tsx
import { Delete01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
```

- [ ] **Step 2: Add `handleRoleChange`, right after `handleTransferOwnership` and before `handleRemove`**

Change:

```tsx
      appToast.success("Ownership transferred", {
        description: `${member.full_name ?? member.email ?? "This user"} is now the owner of ${businessUnitName}. You are now a viewer.`,
      });
      window.location.href = "/dashboard/business-units";
    });
  }

  function handleRemove(member: BusinessUnitMember) {
```

to:

```tsx
      appToast.success("Ownership transferred", {
        description: `${member.full_name ?? member.email ?? "This user"} is now the owner of ${businessUnitName}. You are now a viewer.`,
      });
      window.location.href = "/dashboard/business-units";
    });
  }

  function handleRoleChange(member: BusinessUnitMember, role: "editor" | "viewer") {
    startTransition(async () => {
      const result = await requestMembershipUpdate("PATCH", {
        memberUserId: member.user_id,
        role,
      });

      if (result.error) {
        appToast.error("Could not update role", { description: result.error });
        return;
      }

      appToast.success("Role updated", {
        description: `${member.full_name ?? member.email ?? "This user"} is now ${role === "editor" ? "an editor" : "a viewer"}.`,
      });
      window.location.reload();
    });
  }

  function handleRemove(member: BusinessUnitMember) {
```

- [ ] **Step 3: Add "Editor" to the role-filter dropdown**

Change:

```tsx
                items={[
                  { value: "all", label: "All roles" },
                  { value: "owner", label: "Owner" },
                  { value: "viewer", label: "Viewer" },
                ]}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
```

to:

```tsx
                items={[
                  { value: "all", label: "All roles" },
                  { value: "owner", label: "Owner" },
                  { value: "editor", label: "Editor" },
                  { value: "viewer", label: "Viewer" },
                ]}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
```

- [ ] **Step 4: Replace the per-row Role cell and Actions cell**

Change:

```tsx
                {paginatedMembers.map((member) => {
                  const displayName = member.full_name?.trim() || member.email || member.user_id;
                  const isOwner = member.role === "owner";
                  const isPrimaryOwner = member.user_id === primaryOwnerUserId;

                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-zinc-900">{displayName}</div>
                          {member.email ? (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="default">Owner</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Viewer</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPrimaryOwner ? (
                          <div className="flex items-center justify-end gap-2">
                            {!isOwner ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-zinc-700"
                                disabled={isPending}
                                onClick={() => setTransferTarget(member)}
                              >
                                <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3.5" />
                                Make owner
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-destructive hover:text-destructive"
                              disabled={isPending}
                              onClick={() => (isOwner ? setRemoveTarget(member) : handleRemove(member))}
                            >
                              <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3.5" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Owner access is permanent</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
```

to:

```tsx
                {paginatedMembers.map((member) => {
                  const displayName = member.full_name?.trim() || member.email || member.user_id;
                  const isPrimaryOwner = member.user_id === primaryOwnerUserId;

                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-zinc-900">{displayName}</div>
                          {member.email ? (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isPrimaryOwner ? (
                          <Badge variant="default">Owner</Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(value: string) => {
                              if (value === "owner") {
                                setTransferTarget(member);
                              } else {
                                handleRoleChange(member, value as "editor" | "viewer");
                              }
                            }}
                          >
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPrimaryOwner ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            disabled={isPending}
                            onClick={() => (member.role !== "viewer" ? setRemoveTarget(member) : handleRemove(member))}
                          >
                            <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3.5" />
                            Remove
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Owner access is permanent</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
```

- [ ] **Step 5: Generalize the remove-confirmation dialog copy to cover editors, not just owners**

Change:

```tsx
            <AlertDialogHeader>
              <AlertDialogTitle>Remove owner access?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget
                  ? `${removeTarget.full_name ?? removeTarget.email ?? "This user"} currently has owner access to ${businessUnitName}. Removing them revokes all access, including admin rights.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
```

to:

```tsx
            <AlertDialogHeader>
              <AlertDialogTitle>Remove access?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget
                  ? `${removeTarget.full_name ?? removeTarget.email ?? "This user"} currently has ${removeTarget.role} access to ${businessUnitName}. Removing them revokes all access${removeTarget.role === "owner" ? ", including admin rights" : ""}.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `business-unit-members-panel.tsx`.

- [ ] **Step 7: Manual browser walkthrough**

Depends on migration 016 being pushed (Task 1 deferred that to the human) and Task 2 being complete. If the migration hasn't been pushed yet, skip this step and note it in your report. If it has:

With `npm run dev` running, sign in as the owner of a business unit that has at least one invited viewer, and open `/dashboard/business-units/<bu-id>/members`:
1. Confirm the role-filter dropdown now offers "Editor" alongside "All roles"/"Owner"/"Viewer".
2. Confirm the primary owner's row still shows a plain "Owner" badge with "Owner access is permanent" and no dropdown.
3. Confirm every other row (including any legacy row already showing "Owner") shows an interactive dropdown with Viewer/Editor/Owner options, defaulting to that row's current role.
4. Pick "Editor" for a viewer row — confirm an immediate "Role updated" toast and the page reloads showing "Editor" selected for that row, no confirmation dialog.
5. Pick "Owner" for that same row — confirm the existing transfer-ownership confirmation dialog appears (unchanged copy/behavior).
6. Cancel that dialog, then click "Remove" on an editor-role row — confirm the confirmation dialog appears with copy mentioning "editor access" (not "owner access"), and completing it removes the member.
7. Click "Remove" on a plain viewer row — confirm it removes immediately with no confirmation dialog (unchanged behavior).

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/business-units/_components/business-unit-members-panel.tsx
git commit -m "feat: single role dropdown replaces Make-owner button in members panel"
```

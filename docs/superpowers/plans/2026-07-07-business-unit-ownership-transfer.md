# Business Unit Ownership Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business-unit owner transfer their admin/owner status to another member, guaranteeing the business unit always has at least one real owner.

**Architecture:** `business_units.user_id` stays the single source of truth for real ownership (a required column, so "always exactly one owner" needs no extra invariant logic). A new `SECURITY DEFINER` Postgres function reassigns that column plus the two affected `business_unit_members.role` rows atomically. The existing PATCH endpoint calls this function instead of doing a plain `UPDATE`; the invite endpoint stops accepting `role: "owner"`; the Members panel repurposes its existing "Make owner" button to trigger the transfer behind a confirmation dialog.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + `@supabase/ssr`), Zod, TypeScript, Tailwind, shadcn-style UI primitives (`components/ui`), `@base-ui/react`.

## Global Constraints

- Full design rationale and the approved SQL live in `docs/superpowers/specs/2026-07-07-business-unit-ownership-transfer-design.md` — read it before starting if anything here is unclear.
- No automated test framework exists in this repo (no `test` script in `package.json`). Verification is: `npx tsc --noEmit` for type safety, SQL checks run directly against the project's Supabase instance for the migration, and a manual browser walkthrough for the UI.
- Follow the existing migration pattern (`SECURITY DEFINER`, `SET search_path = public`, explicit `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated`) — see `supabase/migrations/008_accessible_business_units_rpc.sql`.
- Migrations are applied with `npm run supabase:db:push` (wraps `npx supabase db push`), the same command used for all prior migrations in this repo.

---

### Task 1: Add `transfer_business_unit_ownership` migration

**Files:**
- Create: `supabase/migrations/014_transfer_business_unit_ownership.sql`

**Interfaces:**
- Produces: a Postgres RPC `transfer_business_unit_ownership(p_business_unit_id UUID, p_new_owner_id UUID) RETURNS VOID`, callable via `supabase.rpc("transfer_business_unit_ownership", { p_business_unit_id, p_new_owner_id })` from any authenticated Next.js server context. Tasks 2/3 depend on this exact function name and parameter names.
- Consumes: existing `public.is_business_unit_owner(p_business_unit_id UUID, p_user_id UUID DEFAULT auth.uid()) RETURNS BOOLEAN` (defined in `supabase/migrations/005_shared_business_unit_owners.sql`) and the existing `business_units` / `business_unit_members` tables.

- [ ] **Step 1: Write the migration file**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Business Unit Ownership Transfer
-- Lets a current owner (the original creator or a promoted co-owner) hand off
-- the business_units.user_id "primary owner" slot to an existing member.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.transfer_business_unit_ownership(
  p_business_unit_id UUID,
  p_new_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF NOT public.is_business_unit_owner(p_business_unit_id, v_caller) THEN
    RAISE EXCEPTION 'Only a current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_unit_members
    WHERE business_unit_id = p_business_unit_id AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this business unit';
  END IF;

  -- Reassign the primary owner slot only if the caller currently holds it.
  -- A promoted (non-creator) owner transferring never touches this column,
  -- so it can't strip the original creator's access as a side effect.
  UPDATE public.business_units
    SET user_id = p_new_owner_id
    WHERE id = p_business_unit_id
      AND user_id = v_caller;

  -- The new owner always gets the 'owner' role in the members table.
  UPDATE public.business_unit_members
    SET role = 'owner'
    WHERE business_unit_id = p_business_unit_id
      AND user_id = p_new_owner_id;

  -- The caller gives up their own owner role, if they held one. Any other
  -- co-owner's role is left untouched.
  UPDATE public.business_unit_members
    SET role = 'viewer'
    WHERE business_unit_id = p_business_unit_id
      AND user_id = v_caller
      AND role = 'owner';
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) TO authenticated;
```

- [ ] **Step 2: Push the migration**

Run: `npm run supabase:db:push`
Expected output: the CLI lists `014_transfer_business_unit_ownership.sql` as a pending migration and reports it applied successfully (no errors). If it prompts for confirmation, confirm.

- [ ] **Step 3: Verify the function rejects a non-owner caller**

Open the Supabase SQL editor for this project (or `npx supabase db execute` if using the CLI against the linked project) and run, logged in as (or impersonating, via `set local role` / a test JWT) a user who is **not** an owner of some existing business unit `<bu-id>` with some other member `<other-user-id>`:

```sql
select public.transfer_business_unit_ownership('<bu-id>'::uuid, '<other-user-id>'::uuid);
```

Expected: an error `Only a current owner can transfer ownership`.

- [ ] **Step 4: Verify the function rejects a non-member target**

As the actual owner of `<bu-id>`, run:

```sql
select public.transfer_business_unit_ownership('<bu-id>'::uuid, '00000000-0000-0000-0000-000000000000'::uuid);
```

Expected: an error `Target user is not a member of this business unit` (assuming that UUID isn't a real member — pick any UUID you know isn't in `business_unit_members` for that business unit).

- [ ] **Step 5: Verify a successful transfer only touches the caller's and target's rows**

Set up (once, using existing app flows or direct inserts): a business unit owned by user A, with user B invited as `viewer` and also promoted to `role='owner'` in `business_unit_members` (so there are two co-owners: A via `business_units.user_id`, B via the members row), and user C invited as `viewer`. As user B, run:

```sql
select public.transfer_business_unit_ownership('<bu-id>'::uuid, '<user-c-id>'::uuid);
```

Then check:

```sql
select bu.user_id as primary_owner, m.user_id, m.role
from public.business_units bu
join public.business_unit_members m on m.business_unit_id = bu.id
where bu.id = '<bu-id>'::uuid
order by m.role, m.user_id;
```

Expected: `primary_owner` is still user A (untouched, since B — not A — was the caller); user B's row is now `role = 'viewer'`; user C's row is now `role = 'owner'`; user A's row is unchanged (`role = 'owner'`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/014_transfer_business_unit_ownership.sql
git commit -m "feat: add transfer_business_unit_ownership RPC"
```

---

### Task 2: Invite endpoint — viewer-only

**Files:**
- Modify: `app/dashboard/business-units/[id]/members/api/route.ts:1-132` (imports at top of file, `inviteBusinessUnitMemberSchema`, and the `POST` handler)

**Interfaces:**
- Consumes: nothing new.
- Produces: `POST /dashboard/business-units/:id/members/api` now accepts `{ email: string }` only (no `role` field); it always inserts the new member with `role: "viewer"`. This is what Task 4's `handleInvite` will call.

- [ ] **Step 1: Remove the `role` field from the invite schema and the now-unused type import**

In `app/dashboard/business-units/[id]/members/api/route.ts`, change:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import {
  BUSINESS_UNIT_MEMBER_ROLES,
  type BusinessUnitMemberRole,
} from "@/lib/types/invoice";

const inviteBusinessUnitMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(BUSINESS_UNIT_MEMBER_ROLES).default("viewer"),
});
```

to:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/action";
import { BUSINESS_UNIT_MEMBER_ROLES } from "@/lib/types/invoice";

const inviteBusinessUnitMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
```

(`BUSINESS_UNIT_MEMBER_ROLES` stays imported — it's still used by `updateBusinessUnitMemberSchema` below.)

- [ ] **Step 2: Stop accepting a client-supplied role in `POST`, hardcode `"viewer"` on insert**

Change:

```ts
  const json = await request.json().catch(() => null);
  const result = inviteBusinessUnitMemberSchema.safeParse({
    email: typeof json?.email === "string" ? json.email.trim().toLowerCase() : json?.email,
    role: json?.role as BusinessUnitMemberRole | undefined,
  });
```

to:

```ts
  const json = await request.json().catch(() => null);
  const result = inviteBusinessUnitMemberSchema.safeParse({
    email: typeof json?.email === "string" ? json.email.trim().toLowerCase() : json?.email,
  });
```

And change:

```ts
  const { error } = await supabase.from("business_unit_members").insert({
    business_unit_id: id,
    user_id: profile.id,
    role: result.data.role,
    invited_by: user.id,
  });
```

to:

```ts
  const { error } = await supabase.from("business_unit_members").insert({
    business_unit_id: id,
    user_id: profile.id,
    role: "viewer",
    invited_by: user.id,
  });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `route.ts` (pre-existing unrelated errors elsewhere, if any, are out of scope).

- [ ] **Step 4: Manual verification**

With the dev server running (`npm run dev`), from the browser's authenticated session, send (via the browser devtools console on the members page, or `curl` with your session cookie):

```bash
curl -i -X POST "http://localhost:3000/dashboard/business-units/<bu-id>/members/api" \
  -H "Content-Type: application/json" \
  -H "Cookie: <your sb-* cookies>" \
  --data '{"email":"someone@example.com","role":"owner"}'
```

Expected: the request still succeeds (or fails only for unrelated reasons like "no existing user with that email"), and inspecting `business_unit_members` afterward shows the new row with `role = 'viewer'` regardless of the `"role":"owner"` sent in the body — confirming the server no longer honors a client-supplied role.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/business-units/\[id\]/members/api/route.ts
git commit -m "feat: invites always create viewer members"
```

---

### Task 3: PATCH endpoint — transfer via RPC

**Files:**
- Modify: `app/dashboard/business-units/[id]/members/api/route.ts:184-243` (the `PATCH` handler)

**Interfaces:**
- Consumes: `transfer_business_unit_ownership` RPC from Task 1 (`supabase.rpc("transfer_business_unit_ownership", { p_business_unit_id, p_new_owner_id })`); the file's existing local `getOwnedBusinessUnit(supabase, businessUnitId, userId)` helper (`route.ts:39-60`, unchanged — it already checks both `business_units.user_id` and `business_unit_members.role === "owner"`, consistent with the DB-level check).
- Produces: `PATCH /dashboard/business-units/:id/members/api` with body `{ memberUserId: string, role: "owner" }` now performs a real ownership transfer via the RPC. A body with `role: "viewer"` now returns `400`. This is what Task 4's `handleTransferOwnership` will call.

- [ ] **Step 1: Reject `role: "viewer"` and swap the plain `UPDATE` for the RPC call**

In the `PATCH` handler, change:

```ts
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
      { error: "Only business-unit owners can update member roles." },
      { status: 403 }
    );
  }

  if (result.data.memberUserId === user.id) {
    return NextResponse.json(
      { error: "You cannot change your own owner role from this screen." },
      { status: 400 }
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

to:

```ts
  const json = await request.json().catch(() => null);
  const result = updateBusinessUnitMemberSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? "Invalid role update payload" },
      { status: 400 }
    );
  }

  if (result.data.role !== "owner") {
    return NextResponse.json(
      { error: "A member is already a viewer; there is nothing to update." },
      { status: 400 }
    );
  }

  const businessUnit = await getOwnedBusinessUnit(supabase, id, user.id);

  if (!businessUnit) {
    return NextResponse.json(
      { error: "Only a current owner can transfer ownership." },
      { status: 403 }
    );
  }

  if (result.data.memberUserId === user.id) {
    return NextResponse.json(
      { error: "You are already the owner." },
      { status: 400 }
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

  const { error } = await supabase.rpc("transfer_business_unit_ownership", {
    p_business_unit_id: id,
    p_new_owner_id: result.data.memberUserId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `route.ts`.

- [ ] **Step 3: Manual verification**

Using a business unit you own with at least one invited viewer, from the browser devtools console on the members page (so the session cookie is sent automatically):

```js
fetch(`/dashboard/business-units/<bu-id>/members/api`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ memberUserId: "<viewer-user-id>", role: "owner" }),
}).then((r) => r.json()).then(console.log)
```

Expected: `{ ok: true }`. Reload `/dashboard/business-units` and confirm the business unit's owner-only actions (edit/delete) are no longer available to you, and that the viewer, when logged in, now has them.

Then try demoting a non-owner directly:

```js
fetch(`/dashboard/business-units/<bu-id>/members/api`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ memberUserId: "<some-viewer-user-id>", role: "viewer" }),
}).then((r) => r.json()).then(console.log)
```

Expected: `400` with `{ error: "A member is already a viewer; there is nothing to update." }`.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/business-units/\[id\]/members/api/route.ts
git commit -m "feat: PATCH transfers ownership via transfer_business_unit_ownership"
```

---

### Task 4: Members panel — confirm-and-transfer UI, drop redundant controls

**Files:**
- Modify: `app/dashboard/business-units/_components/business-unit-members-panel.tsx` (whole file, currently 350 lines)

**Interfaces:**
- Consumes: `POST`/`PATCH` endpoints from Tasks 2/3 (same request/response shapes as today, except invite no longer sends `role` and PATCH is only ever called with `role: "owner"`); `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from `@/components/ui/alert-dialog`.
- Produces: no new exports — `BusinessUnitMembersPanel`'s props are unchanged.

- [ ] **Step 1: Update imports — add `AlertDialog*`, drop the duplicate `BusinessUnitMemberRole` import**

Change:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import type { BusinessUnitMember } from "@/lib/types/invoice";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/custom/search-input";
import { TablePagination } from "@/components/custom/table-pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, Shield01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
import type { BusinessUnitMemberRole } from "@/lib/types/invoice";
```

to:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import type { BusinessUnitMember, BusinessUnitMemberRole } from "@/lib/types/invoice";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/custom/search-input";
import { TablePagination } from "@/components/custom/table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, Shield01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";
```

- [ ] **Step 2: Replace `inviteRole` state with `transferTarget` state**

Change:

```tsx
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BusinessUnitMemberRole>("viewer");
  const [search, setSearch] = useState("");
```

to:

```tsx
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
```

and, right after the `isPending`/`startTransition` line (`const [isPending, startTransition] = useTransition();`), add:

```tsx
  const [transferTarget, setTransferTarget] = useState<BusinessUnitMember | null>(null);
```

- [ ] **Step 3: Simplify `handleInvite`, rename `handleRoleChange` to `handleTransferOwnership`**

Change:

```tsx
  function handleInvite() {
    startTransition(async () => {
      const result = await requestMembershipUpdate("POST", {
        email,
        role: inviteRole,
      });

      if (result.error) {
        appToast.error("Invite failed", { description: result.error });
        return;
      }

      setEmail("");
      appToast.success(inviteRole === "owner" ? "Owner access granted" : "Viewer access granted", {
        description:
          inviteRole === "owner"
            ? `The invited user can now manage ${businessUnitName}.`
            : `The invited user can now view ${businessUnitName}.`,
      });
      window.location.reload();
    });
  }

  function handleRoleChange(member: BusinessUnitMember, role: BusinessUnitMemberRole) {
    startTransition(async () => {
      const result = await requestMembershipUpdate("PATCH", {
        memberUserId: member.user_id,
        role,
      });

      if (result.error) {
        appToast.error("Could not update role", { description: result.error });
        return;
      }

      appToast.success(role === "owner" ? "Member promoted to owner" : "Member changed to viewer", {
        description: `${member.full_name ?? member.email ?? "User"} now has ${role} access.`,
      });
      window.location.reload();
    });
  }
```

to:

```tsx
  function handleInvite() {
    startTransition(async () => {
      const result = await requestMembershipUpdate("POST", { email });

      if (result.error) {
        appToast.error("Invite failed", { description: result.error });
        return;
      }

      setEmail("");
      appToast.success("Viewer access granted", {
        description: `The invited user can now view ${businessUnitName}.`,
      });
      window.location.reload();
    });
  }

  function handleTransferOwnership(member: BusinessUnitMember) {
    startTransition(async () => {
      const result = await requestMembershipUpdate("PATCH", {
        memberUserId: member.user_id,
        role: "owner",
      });

      if (result.error) {
        appToast.error("Could not transfer ownership", { description: result.error });
        return;
      }

      appToast.success("Ownership transferred", {
        description: `${member.full_name ?? member.email ?? "This user"} is now the owner of ${businessUnitName}.`,
      });
      window.location.reload();
    });
  }
```

(`BusinessUnitMemberRole` stays imported — the `roleFilter` state a few lines below still uses it: `useState<"all" | BusinessUnitMemberRole>("all")`.)

- [ ] **Step 4: Simplify the invite form — remove the role `Select`**

Change:

```tsx
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-member-email">Invite user by email</Label>
              <Input
                id="invite-member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                disabled={isPending}
              />
            </div>
            <div className="">
              <Label htmlFor="invite-member-role mb-2 block">Role</Label>
              <Select value={inviteRole} onValueChange={(value: string) => setInviteRole(value as BusinessUnitMemberRole)}>
                <SelectTrigger id="invite-member-role" className="w-full h-12!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="gap-2 h-12!"
              disabled={isPending || email.trim().length === 0}
              onClick={handleInvite}
            >
              <HugeiconsIcon icon={UserAdd02Icon} strokeWidth={2} className="size-4" />
              Invite
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
                The user must already have an account in this app before you can grant access.
              </p>
        </div>
```

to:

```tsx
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-member-email">Invite user by email</Label>
              <Input
                id="invite-member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                disabled={isPending}
              />
            </div>
            <Button
              type="button"
              className="gap-2 h-12!"
              disabled={isPending || email.trim().length === 0}
              onClick={handleInvite}
            >
              <HugeiconsIcon icon={UserAdd02Icon} strokeWidth={2} className="size-4" />
              Invite
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The user must already have an account in this app before you can grant access. New members are added as viewers.
          </p>
        </div>
```

- [ ] **Step 5: Replace the per-row Role `Select` with plain text, and wire "Make owner" to open the confirmation dialog**

Change:

```tsx
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="default">Owner</Badge>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(value: string) => handleRoleChange(member, value as BusinessUnitMemberRole)}
                          >
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="owner">Owner</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
```

to:

```tsx
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="default">Owner</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Viewer</span>
                        )}
                      </TableCell>
```

Change:

```tsx
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-zinc-700"
                              disabled={isPending}
                              onClick={() => handleRoleChange(member, "owner")}
                            >
                              <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3.5" />
                              Make owner
                            </Button>
```

to:

```tsx
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
```

- [ ] **Step 6: Add the confirmation dialog**

Immediately before the final `</CardContent>` closing tag (i.e. as the last child of `CardContent`, after the `{filteredMembers.length > MEMBERS_PAGE_SIZE ? (...) : null}` pagination block), add:

```tsx
        <AlertDialog
          open={transferTarget !== null}
          onOpenChange={(open) => {
            if (!open) setTransferTarget(null);
          }}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
              <AlertDialogDescription>
                {transferTarget
                  ? `${transferTarget.full_name ?? transferTarget.email ?? "This user"} will become the owner of ${businessUnitName}. You will become a viewer and lose admin access.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (transferTarget) {
                    handleTransferOwnership(transferTarget);
                  }
                  setTransferTarget(null);
                }}
              >
                Transfer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `business-unit-members-panel.tsx`.

- [ ] **Step 8: Manual browser walkthrough**

With `npm run dev` running, sign in as the owner of a business unit that has at least one invited viewer, and open `/dashboard/business-units/<bu-id>/members`:
1. Confirm the invite form shows only an email field and an "Invite" button (no role picker), and inviting a new user succeeds with them appearing as "Viewer".
2. Confirm the viewer's row shows a plain "Viewer" label (no dropdown) and has "Make owner" + "Remove" buttons.
3. Click "Make owner" — confirm the dialog appears with the expected copy naming that member and this business unit.
4. Click "Cancel" — confirm the dialog closes and no request was sent (no toast, no reload).
5. Click "Make owner" again, then "Transfer" — confirm a success toast appears and the page reloads.
6. After reload, confirm the transferred-to member now shows "Owner", you (the former owner) now show "Viewer", and business-unit-level owner-only actions (edit/delete on `/dashboard/business-units`) are no longer available to you.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/business-units/_components/business-unit-members-panel.tsx
git commit -m "feat: confirm-and-transfer ownership UI in members panel"
```

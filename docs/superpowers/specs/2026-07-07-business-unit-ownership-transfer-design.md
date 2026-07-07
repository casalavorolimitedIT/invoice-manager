# Business Unit Ownership Transfer — Design

## Problem

On the business-unit Members page, the current owner has no way to hand off
their admin/owner status to another member. The API explicitly blocks a user
from changing their own role, and the UI shows "Owner access is permanent."
The business unit must always end up with exactly one real owner.

## Current state (for context)

- `business_units.user_id` (NOT NULL) is the original creator.
- `business_unit_members.role` (`'owner' | 'viewer'`) is a separate column.
  As of migration `005_shared_business_unit_owners.sql`, `is_business_unit_owner`
  (and therefore `can_manage_business_unit`, which gates all clients/invoices/
  invoice_sequences/guests RLS policies) already honors **both**: a user counts
  as an owner if `business_units.user_id = auth.uid()` **or** they have a
  `business_unit_members` row with `role = 'owner'`. So promoting a member to
  `'owner'` today already grants them real, RLS-level manage rights — not just
  a display change on the Members page. (An earlier version of this doc
  claimed otherwise; that was based on reading migration 004 only and missed
  that 005 already fixed it.)
- The remaining real gap: `is_business_unit_owner` checks `business_units.user_id`
  **unconditionally**, on top of the membership-role check. That makes the
  original creator a permanent, un-revokable admin — if they demote their own
  `business_unit_members.role` to `'viewer'`, they still secretly retain full
  admin rights via `user_id`, while the UI would incorrectly show them as a
  viewer. There is no existing path that lets the original creator genuinely
  give up admin status.
- Every business unit gets a `business_unit_members` row with `role='owner'`
  for its creator at creation time (`app/dashboard/business-units/actions.ts`),
  so the owner always has a corresponding membership row to update.

## Decision: single true owner

`business_units.user_id` stays the sole source of truth for ownership, because
it's the only thing that lets the *current* real owner (who may be the
original creator) genuinely step down — no combination of
`business_unit_members.role` changes can revoke a creator's access as long as
`is_business_unit_owner` keeps special-casing `user_id`. A transfer actually
reassigns that column (via a secure server-side function), so the new owner
immediately gets full real permissions everywhere (clients, invoices, business
unit switcher, etc.), and the old owner becomes a regular viewer with no
lingering hidden access. `business_unit_members.role` becomes a mirror of
`business_units.user_id` for display/query convenience — kept in sync only by
the transfer function, never set independently elsewhere.

"Always exactly one owner" needs no invariant-checking logic — it falls out of
`business_units.user_id` being a required, single-valued column.

## Backend

### New migration: `transfer_business_unit_ownership` RPC

```sql
CREATE OR REPLACE FUNCTION public.transfer_business_unit_ownership(
  p_business_unit_id UUID,
  p_new_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_business_unit_owner(p_business_unit_id) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.business_unit_members
    WHERE business_unit_id = p_business_unit_id AND user_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'Target user is not a member of this business unit';
  END IF;

  UPDATE public.business_units
    SET user_id = p_new_owner_id
    WHERE id = p_business_unit_id;

  UPDATE public.business_unit_members
    SET role = CASE WHEN user_id = p_new_owner_id THEN 'owner' ELSE 'viewer' END
    WHERE business_unit_id = p_business_unit_id
      AND (role = 'owner' OR user_id = p_new_owner_id);
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_business_unit_ownership(UUID, UUID) TO authenticated;
```

Runs as a single function call, so the `business_units` update and the two
`business_unit_members` role flips are atomic — no partial-failure window.
`is_business_unit_owner` re-checks `auth.uid()` at call time, so this can only
ever be invoked by whoever is currently the real owner.

### `app/dashboard/business-units/[id]/members/api/route.ts`

- `PATCH` with `role: "owner"`: calls `supabase.rpc("transfer_business_unit_ownership", { p_business_unit_id: id, p_new_owner_id: memberUserId })` instead of the plain `UPDATE`. Existing checks (must be owner, can't target self) stay as pre-conditions before the RPC call.
- `PATCH` with `role: "viewer"`: now rejected with 400 ("A member is already a viewer; there's nothing to update.") — with a single owner, demoting is only ever a side effect of transferring to someone else, never a standalone action.
- `POST` (invite): `inviteBusinessUnitMemberSchema`'s `role` field is dropped; invited members are always created with `role: "viewer"`.

## Frontend

### `business-unit-members-panel.tsx`

- Role column: remove the per-row `Select` (Viewer/Owner) for non-owner rows — a non-owner can only ever be "viewer," so the dropdown never did anything the "Make owner" action doesn't already do. Replace with a plain "Viewer" label, mirroring how the owner row already just shows a badge.
- "Make owner" action: opens a confirmation dialog before firing the request — *"Transfer ownership to {name}? You'll become a viewer and lose admin access to this business unit."* Only calls the PATCH on confirm.
- On success: toast "Ownership transferred", reload — the acting user becomes a viewer everywhere on reload since `current_user_role` / `current_user_can_manage` are derived fresh from the DB.
- Invite form: remove the role `Select`; the form becomes a single email input with copy updated to reflect "invite as viewer."

## Edge cases

- Transfer-to-self: impossible, "Make owner" only renders on non-owner rows.
- Two rapid/concurrent transfer attempts: the RPC re-checks `is_business_unit_owner` at call time, so a second call from the now-former-owner fails with "Only the current owner can transfer ownership."
- Removing members: unchanged — still blocked for the owner row.

## Testing plan

- SQL-level check (Supabase SQL editor or a migration test): RPC rejects a non-owner caller and rejects a target that isn't a member.
- Manual walkthrough: create a business unit, invite a second user as viewer, transfer ownership, confirm the old owner now shows as "viewer" everywhere (nav/business-unit switcher, clients/invoices create buttons hidden) and the new owner has full manage access immediately.

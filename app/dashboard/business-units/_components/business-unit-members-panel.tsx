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
import { Delete01Icon, UserAdd02Icon } from "@hugeicons/core-free-icons";

const MEMBERS_PAGE_SIZE = 10;

interface BusinessUnitMembersPanelProps {
  businessUnitId: string;
  businessUnitName: string;
  primaryOwnerUserId: string;
  members: BusinessUnitMember[];
}

export function BusinessUnitMembersPanel({
  businessUnitId,
  businessUnitName,
  primaryOwnerUserId,
  members,
}: BusinessUnitMembersPanelProps) {
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | BusinessUnitMemberRole>("all");
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [transferTarget, setTransferTarget] = useState<BusinessUnitMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BusinessUnitMember | null>(null);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [member.full_name, member.email, member.user_id, member.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [members, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedMembers = filteredMembers.slice(
    safePage * MEMBERS_PAGE_SIZE,
    (safePage + 1) * MEMBERS_PAGE_SIZE,
  );

  async function requestMembershipUpdate(method: "POST" | "DELETE" | "PATCH", body: Record<string, string>) {
    const response = await fetch(`/dashboard/business-units/${businessUnitId}/members/api`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      return { error: payload?.error ?? "Request failed." };
    }

    return payload ?? {};
  }

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
    startTransition(async () => {
      const result = await requestMembershipUpdate("DELETE", {
        memberUserId: member.user_id,
      });

      if (result.error) {
        appToast.error("Could not remove member", { description: result.error });
        return;
      }

      appToast.success("Member removed", {
        description: `${member.full_name ?? member.email ?? "User"} no longer has access.`,
      });
      window.location.reload();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Access</CardTitle>
        <CardDescription>
          Invite existing users by email to view this business unit, its clients, invoices, and reports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="rounded-2xl border bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_12rem] xl:items-end">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</p>
              <SearchInput
                value={search}
                onChange={(value) => {
                  setPage(0);
                  setSearch(value);
                }}
                placeholder="Search name, email, role..."
                isClearable
                delay={250}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
              <Select
                value={roleFilter}
                onValueChange={(value: string) => {
                  setPage(0);
                  setRoleFilter(value as "all" | BusinessUnitMemberRole);
                }}
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
            </div>
          </div>
        </div>

        <div className="rounded-2xl border">
          {filteredMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access Granted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                            items={[
                              { value: "viewer", label: "Viewer" },
                              { value: "editor", label: "Editor" },
                              { value: "owner", label: "Owner" },
                            ]}
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
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">No members match your filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different search term or role filter.</p>
            </div>
          )}
        </div>

        {filteredMembers.length > MEMBERS_PAGE_SIZE ? (
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filteredMembers.length}
            pageSize={MEMBERS_PAGE_SIZE}
            onPageChange={setPage}
          />
        ) : null}

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

        <AlertDialog
          open={removeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove access?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget
                  ? `${removeTarget.full_name ?? removeTarget.email ?? "This user"} currently has ${removeTarget.role} access to ${businessUnitName}. Removing them revokes all access${removeTarget.role === "owner" ? ", including admin rights" : ""}.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeTarget) {
                    handleRemove(removeTarget);
                  }
                  setRemoveTarget(null);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
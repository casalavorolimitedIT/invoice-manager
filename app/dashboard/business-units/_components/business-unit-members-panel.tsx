"use client";

import { useState, useTransition } from "react";
import type { BusinessUnitMember } from "@/lib/types/invoice";
import { appToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

interface BusinessUnitMembersPanelProps {
  businessUnitId: string;
  businessUnitName: string;
  members: BusinessUnitMember[];
}

export function BusinessUnitMembersPanel({
  businessUnitId,
  businessUnitName,
  members,
}: BusinessUnitMembersPanelProps) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<BusinessUnitMemberRole>("viewer");
  const [isPending, startTransition] = useTransition();

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
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as BusinessUnitMemberRole)}>
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

        <div className="rounded-2xl border">
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
              {members.map((member) => {
                const displayName = member.full_name?.trim() || member.email || member.user_id;
                const isOwner = member.role === "owner";

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
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member, value as BusinessUnitMemberRole)}
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
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isOwner ? (
                        <div className="flex items-center justify-end gap-2">
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
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            disabled={isPending}
                            onClick={() => handleRemove(member)}
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
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
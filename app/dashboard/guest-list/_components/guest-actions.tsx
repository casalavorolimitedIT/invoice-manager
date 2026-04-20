"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/toast";
import type { BusinessUnit, GuestWithImageUrl } from "@/lib/types/invoice";
import { GuestDetailsDialog } from "@/components/guests/guest-details-dialog";
import { DeleteModal } from "@/components/custom/DeleteModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Edit01Icon, UserGroupIcon, ViewIcon } from "@hugeicons/core-free-icons";

export function GuestActions({
  guest,
  businessUnits,
  canManage,
}: {
  guest: GuestWithImageUrl;
  businessUnits: BusinessUnit[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const env = process.env.NODE_ENV;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/dashboard/guest-list/${guest.id}/api`, {
        method: "DELETE",
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok || result?.error) {
        appToast.error(result?.error ?? "Failed to delete guest");
        return;
      }

      appToast.success("Guest deleted");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs"
          onClick={() => setDetailsOpen(true)}
        >
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
          View
        </Button>
        {canManage ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              render={<Link href={`/dashboard/clients/new?guestId=${guest.id}`} />}
            >
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
              Create Client
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs"
              render={<Link href={`/dashboard/guest-list/${guest.id}/edit`} />}
            >
              <HugeiconsIcon
                icon={Edit01Icon}
                strokeWidth={2}
                className="size-3.5"
              />
              Edit
            </Button>
            {env === "development" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  strokeWidth={2}
                  className="size-3.5"
                />
                Delete
              </Button>
            )}
          </>
        ) : (
          <Badge
            variant="outline"
            className="text-xs text-sky-700 border-sky-200 bg-sky-50"
          >
            View only
          </Badge>
        )}
      </div>

      <GuestDetailsDialog
        guest={guest}
        businessUnits={businessUnits}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <DeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        itemName={`${guest.first_name} ${guest.last_name}`}
        isLoading={isDeleting}
        title="Delete guest"
        description="Delete this guest record from the directory. This action cannot be undone."
      />
    </>
  );
}

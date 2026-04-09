"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/custom/DeleteModal";
import {
  archiveBusinessUnit,
  unarchiveBusinessUnit,
  deleteBusinessUnit,
} from "@/app/dashboard/business-units/actions";
import { appToast } from "@/lib/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Archive01Icon, Delete01Icon, ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

interface BusinessUnitActionsProps {
  id: string;
  name: string;
  isArchived?: boolean;
}

export function BusinessUnitActions({ id, name, isArchived = false }: BusinessUnitActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleArchive() {
    setIsLoading(true);
    const result = await archiveBusinessUnit(id);
    setIsLoading(false);
    if (result.error) {
      appToast.error("Failed to archive", { description: result.error });
    } else {
      appToast.success(`"${name}" archived`);
      router.refresh();
    }
  }

  async function handleUnarchive() {
    setIsLoading(true);
    const result = await unarchiveBusinessUnit(id);
    setIsLoading(false);
    if (result.error) {
      appToast.error("Failed to restore", { description: result.error });
    } else {
      appToast.success(`"${name}" restored`);
      router.refresh();
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    const result = await deleteBusinessUnit(id);
    setIsLoading(false);
    if (result.error) {
      appToast.error("Failed to delete", { description: result.error });
    } else {
      appToast.success(`"${name}" deleted`);
      setDeleteOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      {isArchived ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleUnarchive}
          disabled={isLoading}
        >
          <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} className="size-3.5" />
          Restore
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={handleArchive}
          disabled={isLoading}
        >
          <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-3.5" />
          Archive
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
        disabled={isLoading}
      >
        <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3.5" />
        Delete
      </Button>

      <DeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Business Unit"
        description={
          <>
            Permanently delete <strong>{name}</strong>? All associated invoices and clients will also be deleted. This cannot be undone.
          </>
        }
        isLoading={isLoading}
        variant="danger"
      />
    </>
  );
}

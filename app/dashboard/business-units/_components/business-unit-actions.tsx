"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/custom/DeleteModal";
import { appToast } from "@/lib/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Archive01Icon,
  Delete01Icon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

interface BusinessUnitActionsProps {
  id: string;
  name: string;
  isArchived?: boolean;
  view: "table" | "card";
}

export function BusinessUnitActions({
  id,
  name,
  isArchived = false,
  view
}: BusinessUnitActionsProps) {
  const env = process.env.NODE_ENV || "development";
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function requestBusinessUnitUpdate(method: "PATCH" | "DELETE", body?: Record<string, string | boolean>) {
    const response = await fetch(`/dashboard/business-units/${id}/api`, {
      method,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      return { error: payload?.error ?? "Request failed." };
    }

    return payload ?? {};
  }

  async function handleArchive() {
    setIsLoading(true);
    const result = await requestBusinessUnitUpdate("PATCH", { isArchived: true });
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
    const result = await requestBusinessUnitUpdate("PATCH", { isArchived: false });
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
    const result = await requestBusinessUnitUpdate("DELETE");
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
    <div className={`flex space-x-2 ${view === "table" ? "flex-col items-start" : "flex-row items-center"}`}>
      {isArchived ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-full text-left flex justify-start gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={handleUnarchive}
          disabled={isLoading}
        >
          <HugeiconsIcon
            icon={ArrowReloadHorizontalIcon}
            strokeWidth={2}
            className="size-3.5"
          />
          Restore
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className={`h-7 ${view === "table" ? "w-full text-left flex justify-start gap-1 text-xs" : "w-auto text-center flex justify-center gap-1 text-xs"} cursor-pointer`}
          onClick={handleArchive}
          disabled={isLoading}
        >
          <HugeiconsIcon
            icon={Archive01Icon}
            strokeWidth={2}
            className="size-3.5"
          />
          Archive
        </Button>
      )}
      {env === "development" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-full text-left flex justify-start gap-1 text-xs text-destructive hover:text-destructive cursor-pointer"
            onClick={() => setDeleteOpen(true)}
            disabled={isLoading}
          >
            <HugeiconsIcon
              icon={Delete01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Delete
          </Button>

          <DeleteModal
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDelete}
            title="Delete Business Unit"
            description={
              <>
                Permanently delete <strong>{name}</strong>? Linked clients will
                be deleted, but deletion is blocked while invoices still point
                to this business unit. Move or delete those invoices first.
              </>
            }
            isLoading={isLoading}
            variant="danger"
          />
        </>
      )}
    </div>
  );
}

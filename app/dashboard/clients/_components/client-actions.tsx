"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/custom/DeleteModal";
import { deleteClient } from "@/app/dashboard/clients/actions";
import { appToast } from "@/lib/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

export function ClientActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    setIsLoading(true);
    const result = await deleteClient(id);
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
        title="Delete Client"
        description={<>Permanently delete <strong>{name}</strong>? Their invoices will be retained but the client link will be removed.</>}
        isLoading={isLoading}
      />
    </>
  );
}

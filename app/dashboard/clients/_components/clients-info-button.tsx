"use client";

import { useState } from "react";
import { InfoModal, InfoModalTrigger } from "@/components/custom/InfoModal";

export function ClientsInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InfoModalTrigger onClick={() => setOpen(true)} />
      <InfoModal
        open={open}
        onOpenChange={setOpen}
        title="Client Directory"
        description={
          <span>
            The Client Directory stores recurring bill-to contacts for quick selection in the Invoice Builder. Each client is linked to a Business Unit.
            <br /><br />
            You can also enter client details manually on any invoice if they&apos;re not in the directory.
          </span>
        }
        relatedLinks={[
          { href: "/dashboard/business-units", label: "Business Units", description: "clients belong to a unit" },
          { href: "/dashboard/invoices/new", label: "New Invoice", description: "select a client during creation" },
        ]}
      />
    </>
  );
}

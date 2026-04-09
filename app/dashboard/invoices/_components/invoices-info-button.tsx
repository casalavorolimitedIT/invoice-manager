"use client";

import { useState } from "react";
import { InfoModal, InfoModalTrigger } from "@/components/custom/InfoModal";

export function InvoicesInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InfoModalTrigger onClick={() => setOpen(true)} />
      <InfoModal
        open={open}
        onOpenChange={setOpen}
        title="Invoices"
        description={
          <span>
            Invoices are issued under a specific Business Unit and can be addressed to any client in
            your directory or entered manually. Each invoice has an auto-generated number, a full
            line-item breakdown, and a lifecycle of{" "}
            <strong>Draft → Sent → Paid → Overdue</strong>.
            <br />
            <br />
            Totals are always calculated server-side to prevent tampering. A snapshot of the
            business-unit branding is captured at creation so the invoice looks correct even if
            you later change your branding.
          </span>
        }
        relatedLinks={[
          {
            href: "/dashboard/business-units",
            label: "Business Units",
            description: "branding & bank details used on invoices",
          },
          {
            href: "/dashboard/clients",
            label: "Client Directory",
            description: "quick-select clients when building invoices",
          },
          {
            href: "/dashboard/reports",
            label: "Reports",
            description: "revenue and status breakdown",
          },
        ]}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { InfoModal, InfoModalTrigger } from "@/components/custom/InfoModal";

export function DashboardInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <InfoModalTrigger onClick={() => setOpen(true)} />
      <InfoModal
        open={open}
        onOpenChange={setOpen}
        title="Dashboard"
        description={
          <span>
            The dashboard gives you a live summary of your invoicing workspace: revenue, invoice status, recent activity, and shortcuts to the pages you use most.
            <br />
            <br />
            When a business unit is active, the numbers reflect that scope so you can focus on one unit without losing context.
          </span>
        }
        relatedLinks={[
          {
            href: "/dashboard/invoices",
            label: "Invoices",
            description: "create, send, and manage invoices",
          },
          {
            href: "/dashboard/clients",
            label: "Clients",
            description: "manage your billing contacts",
          },
          {
            href: "/dashboard/reports",
            label: "Reports",
            description: "see deeper revenue breakdowns",
          },
        ]}
      />
    </>
  );
}
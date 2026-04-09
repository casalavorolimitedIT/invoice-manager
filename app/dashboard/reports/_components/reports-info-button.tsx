"use client";

import { useState } from "react";
import { InfoModal, InfoModalTrigger } from "@/components/custom/InfoModal";

export function ReportsInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InfoModalTrigger onClick={() => setOpen(true)} />
      <InfoModal
        open={open}
        onOpenChange={setOpen}
        title="Reports"
        description={
          <span>
            Reports show a financial summary across all your business units — total revenue, amounts
            collected, outstanding balances, overdue amounts, and draft totals.
            <br />
            <br />
            All figures are calculated from your invoice data in real time. Use them to monitor cash
            flow and identify invoices that need follow-up.
          </span>
        }
        relatedLinks={[
          {
            href: "/dashboard/invoices",
            label: "Invoices",
            description: "view and manage individual invoices",
          },
          {
            href: "/dashboard/business-units",
            label: "Business Units",
            description: "per-unit settings and branding",
          },
        ]}
      />
    </>
  );
}

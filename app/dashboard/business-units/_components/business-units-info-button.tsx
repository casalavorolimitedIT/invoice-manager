"use client";

import { useState } from "react";
import { InfoModal, InfoModalTrigger } from "@/components/custom/InfoModal";

export function BusinessUnitsInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <InfoModalTrigger onClick={() => setOpen(true)} />
      <InfoModal
        open={open}
        onOpenChange={setOpen}
        title="Business Units"
        description={
          <span>
            A Business Unit represents a separate company, brand, or department that issues invoices independently. Each unit has its own logo, branding, tax settings, bank details, and invoice numbering sequence.
            <br /><br />
            Common uses: IT Services, Real Estate, Finance Consulting, Hotel Management, Sales &amp; Distribution — or any other entity you need to invoice under.
          </span>
        }
        relatedLinks={[
          { href: "/dashboard/clients", label: "Clients", description: "clients scoped to each unit" },
          { href: "/dashboard/invoices", label: "Invoices", description: "invoices issued under a unit" },
        ]}
      />
    </>
  );
}

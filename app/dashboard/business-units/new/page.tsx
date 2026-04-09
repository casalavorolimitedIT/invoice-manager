import { SiteHeader } from "@/components/site-header";
import { BusinessUnitForm } from "../_components/business-unit-form";
import { createBusinessUnit } from "../actions";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function NewBusinessUnitPage() {
  return (
    <>
      <SiteHeader title="New Business Unit" />
      <div className="p-4 md:p-6 w-full flex flex-col items-center justify-center">
        <div className="mb-6 w-full max-w-4xl">
          <Link
            href="/dashboard/business-units"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to Business Units
          </Link>
          <p className="text-xs text-muted-foreground mt-3 max-w-2xl">
            Configure a new business unit with its own branding, tax settings, and banking details. Supports any industry — IT, Real Estate, Finance, Hotel Management, Sales, and more.
          </p>
        </div>
       <div className="w-full max-w-4xl">
         <BusinessUnitForm action={createBusinessUnit} />
       </div>
      </div>
    </>
  );
}

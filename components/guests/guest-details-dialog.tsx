"use client";

import { useState } from "react";
import type { GuestWithImageUrl, BusinessUnit } from "@/lib/types/invoice";
import SmartImage from "@/components/custom/smart-images";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";


const identificationLabelMap: Record<string, string> = {
  passport: "Passport",
  "drivers-license": "Driver's License",
  "national-id": "National ID",
  "voters-card": "Voter's Card",
  "residence-permit": "Residence Permit",
  other: "Other",
};

const genderLabelMap: Record<string, string> = {
  female: "Female",
  male: "Male",
  "non-binary": "Non-binary",
  "prefer-not-to-say": "Prefer not to say",
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || "Not provided"}</p>
    </div>
  );
}

export function GuestDetailsDialog({
  guest,
  businessUnits,
  open,
  onOpenChange,
}: {
  guest: GuestWithImageUrl;
  businessUnits: BusinessUnit[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const businessUnit = businessUnits.find((unit) => unit.id === guest.business_unit_id);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      {/* ── Lightbox ── */}
      {lightboxOpen && guest.identification_image_url && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close fullscreen"
          >
            {/* X icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <SmartImage
              src={guest.identification_image_url}
              alt={`${guest.first_name} ${guest.last_name} identification`}
              width={1600}
              height={1200}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl! max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{guest.first_name} {guest.last_name}</DialogTitle>
          <DialogDescription>
            Guest profile and submitted identification details.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="First Name" value={guest.first_name} />
            <DetailRow label="Last Name" value={guest.last_name} />
            <DetailRow label="Phone Number" value={guest.phone_number} />
            <DetailRow label="Email" value={guest.email} />
            <DetailRow label="Birthday" value={guest.birthday} />
            <DetailRow label="Gender" value={guest.gender ? genderLabelMap[guest.gender] ?? guest.gender : null} />
            <DetailRow label="Nationality" value={guest.nationality} />
            <DetailRow label="Emergency Contact" value={guest.emergency_contact} />
            <DetailRow
              label="Means of Identification"
              value={guest.identification_type ? identificationLabelMap[guest.identification_type] ?? guest.identification_type : null}
            />
            <DetailRow label="ID Number" value={guest.identification_number} />
            <div className="rounded-xl border bg-muted/20 p-3 sm:col-span-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Business Unit</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline">{businessUnit?.name ?? "Unknown business unit"}</Badge>
                {businessUnit?.code ? <Badge variant="secondary">{businessUnit.code}</Badge> : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border bg-muted/10 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Identification Capture
              </p>
              {guest.identification_image_url ? (
                <div className="group relative mt-3">
                  <SmartImage
                    src={guest.identification_image_url}
                    alt={`${guest.first_name} ${guest.last_name} identification`}
                    width={640}
                    height={640}
                    className="h-72 w-full rounded-xl object-cover"
                    wrapperClassName="h-72 w-full rounded-xl overflow-hidden"
                  />
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-opacity opacity-100 cursor-pointer"
                    aria-label="View fullscreen"
                  >
                    {/* Maximize icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                    View fullscreen
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  No image uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
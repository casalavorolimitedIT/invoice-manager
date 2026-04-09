"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Client, BusinessUnit } from "@/lib/types/invoice";
import type { ClientActionState } from "@/app/dashboard/clients/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
    </Button>
  );
}

interface ClientFormProps {
  action: (state: ClientActionState, formData: FormData) => Promise<ClientActionState>;
  defaultValues?: Client;
  businessUnits: BusinessUnit[];
}

export function ClientForm({ action, defaultValues, businessUnits }: ClientFormProps) {
  const isEdit = Boolean(defaultValues);
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      {/* ── Business Unit ───────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="business_unit_id">
          Business Unit <span className="text-destructive">*</span>
        </Label>
        <select
          id="business_unit_id"
          name="business_unit_id"
          required
          defaultValue={defaultValues?.business_unit_id ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select a business unit…</option>
          {businessUnits.map((bu) => (
            <option key={bu.id} value={bu.id}>
              {bu.name} ({bu.code})
            </option>
          ))}
        </select>
        {state.fieldErrors?.business_unit_id && (
          <p className="text-xs text-destructive">{state.fieldErrors.business_unit_id[0]}</p>
        )}
      </div>

      <Separator />

      {/* ── Identity ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Client Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Jane Smith"
              defaultValue={defaultValues?.name ?? ""}
            />
            {state.fieldErrors?.name && (
              <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              placeholder="Acme Corp"
              defaultValue={defaultValues?.company ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              defaultValue={defaultValues?.email ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              defaultValue={defaultValues?.phone ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input
              id="tax_id"
              name="tax_id"
              placeholder="Optional"
              defaultValue={defaultValues?.tax_id ?? ""}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Address ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Address</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: "address", label: "Street Address", placeholder: "123 Main St" },
            { id: "city", label: "City", placeholder: "Lagos" },
            { id: "state", label: "State / Province", placeholder: "Lagos State" },
            { id: "country", label: "Country", placeholder: "Nigeria" },
            { id: "postal_code", label: "Postal Code", placeholder: "100001" },
          ].map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id}>{f.label}</Label>
              <Input
                id={f.id}
                name={f.id}
                placeholder={f.placeholder}
                defaultValue={defaultValues?.[f.id as keyof Client] as string ?? ""}
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Notes ─────────────────────────────────────────────── */}
      <section>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Internal notes about this client."
            rows={2}
            defaultValue={defaultValues?.notes ?? ""}
          />
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton isEdit={isEdit} />
        <Button variant="outline" render={<Link href="/dashboard/clients" />}>Cancel</Button>
      </div>
    </form>
  );
}

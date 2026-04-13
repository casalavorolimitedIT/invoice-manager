"use client";

import { useState, useTransition } from "react";
import type { Client, BusinessUnit } from "@/lib/types/invoice";
import { appToast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessUnitCombobox } from "@/components/custom/business-unit-combobox";
import Link from "next/link";

function SubmitButton({ isEdit, isPending }: { isEdit: boolean; isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
    </Button>
  );
}

type ClientFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

interface ClientFormProps {
  id?: string;
  defaultValues?: Client;
  businessUnits: BusinessUnit[];
  initialBusinessUnitId?: string;
}

export function ClientForm({ id, defaultValues, businessUnits, initialBusinessUnitId }: ClientFormProps) {
  const isEdit = Boolean(id);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ClientFormState>({});
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState(
    defaultValues?.business_unit_id ?? initialBusinessUnitId ?? ""
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") {
        payload[key] = value;
      }
    });

    startTransition(async () => {
      setState({});

      const endpoint = id ? `/dashboard/clients/${id}/api` : "/dashboard/clients/api";
      const response = await fetch(endpoint, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as ClientFormState | null;

      if (!response.ok || result?.error) {
        setState({
          error: result?.error ?? "Something went wrong. Please try again.",
          fieldErrors: result?.fieldErrors,
        });
        return;
      }

      appToast.success(id ? "Client updated" : "Client created");
      router.push("/dashboard/clients");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl pb-16">
      <Card>
        <CardHeader>
          <CardTitle>Client Assignment</CardTitle>
          <CardDescription>Choose the business unit that owns this client record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="business_unit_id">
            Business Unit <span className="text-destructive">*</span>
          </Label>
          <BusinessUnitCombobox
            businessUnits={businessUnits}
            value={selectedBusinessUnitId}
            onValueChange={setSelectedBusinessUnitId}
            id="business_unit_id"
            name="business_unit_id"
            placeholder="Search business units..."
            emptyText="No matching business units."
            ariaInvalid={Boolean(state.fieldErrors?.business_unit_id)}
          />
          {state.fieldErrors?.business_unit_id && (
            <p className="text-[11px] text-destructive">{state.fieldErrors.business_unit_id[0]}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
          <CardDescription>Core identity and contact details used on invoices and reminders.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
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
              <p className="text-[11px] text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              placeholder="Acme Corp"
              defaultValue={defaultValues?.company ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input
              id="tax_id"
              name="tax_id"
              placeholder="VAT-12345"
              defaultValue={defaultValues?.tax_id ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              defaultValue={defaultValues?.email ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              defaultValue={defaultValues?.phone ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address & Notes</CardTitle>
          <CardDescription>Billing address details and internal context for the client record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="123 Main St"
              defaultValue={defaultValues?.address ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Lagos" defaultValue={defaultValues?.city ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input
              id="state"
              name="state"
              placeholder="Lagos State"
              defaultValue={defaultValues?.state ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              placeholder="Nigeria"
              defaultValue={defaultValues?.country ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              name="postal_code"
              placeholder="100001"
              defaultValue={defaultValues?.postal_code ?? ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Internal notes about this client."
              rows={3}
              defaultValue={defaultValues?.notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-4 py-4">
        <Button variant="outline" render={<Link href="/dashboard/clients" />}>Cancel</Button>
        <SubmitButton isEdit={isEdit} isPending={isPending} />
      </div>
    </form>
  );
}

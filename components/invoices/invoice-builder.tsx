"use client";

import { useState, useTransition, useMemo } from "react";
import type { BusinessUnit, Client, InvoicePreviewPayload } from "@/lib/types/invoice";
import {
  computeInvoiceTotals,
  formatCurrency,
  addDaysToDate,
  paymentTermsToDays,
} from "@/lib/types/invoice";
import { LineItemsEditor, type LineItem } from "@/components/invoices/line-items-editor";
import { InvoiceTemplate } from "@/components/invoices/invoice-template";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BusinessUnitCombobox } from "@/components/custom/business-unit-combobox";
import { ClientCombobox } from "@/components/custom/client-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appToast } from "@/lib/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice01Icon,
  ViewIcon,
  Building01Icon,
  UserCircle02Icon,
  Calendar01Icon,
  PercentCircleIcon,
  NoteEditIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const PAYMENT_TERMS_OPTIONS = [
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Net 7", label: "Net 7" },
  { value: "Net 14", label: "Net 14" },
  { value: "Net 30", label: "Net 30" },
  { value: "Net 45", label: "Net 45" },
  { value: "Net 60", label: "Net 60" },
  { value: "Net 90", label: "Net 90" },
];

interface InvoiceBuilderProps {
  businessUnits: BusinessUnit[];
  allClients: Client[];
  initialBusinessUnitId?: string;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-border/60">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-4 pt-4", className)}>{children}</div>;
}

export function InvoiceBuilder({
  businessUnits,
  allClients,
  initialBusinessUnitId,
}: InvoiceBuilderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initialBusinessUnit =
    businessUnits.find((businessUnit) => businessUnit.id === initialBusinessUnitId) ?? businessUnits[0];

  const [buId, setBuId] = useState(initialBusinessUnit?.id ?? "");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(
    addDaysToDate(todayISO(), paymentTermsToDays(initialBusinessUnit?.payment_terms ?? "Net 30"))
  );
  const [paymentTerms, setPaymentTerms] = useState(
    initialBusinessUnit?.payment_terms ?? "Net 30"
  );
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedBU = businessUnits.find((b) => b.id === buId);
  const buClients = allClients.filter((c) => c.business_unit_id === buId);
  const taxRate = selectedBU?.default_tax_rate ?? 0;
  const currency = selectedBU?.default_currency ?? "USD";

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
        discountType,
        discountValue,
        taxRate
      ),
    [items, discountType, discountValue, taxRate]
  );

  function handleBUChange(id: string) {
    setBuId(id);
    const bu = businessUnits.find((b) => b.id === id);
    if (bu) {
      const terms = bu.payment_terms ?? "Net 30";
      setPaymentTerms(terms);
      setDueDate(addDaysToDate(issueDate, paymentTermsToDays(terms)));
    }
    setClientId("");
    setClientName("");
    setClientCompany("");
    setClientEmail("");
    setClientAddress("");
  }

  function handleClientSelect(id: string) {
    if (id === "__manual__") {
      setClientId("");
      setClientName("");
      setClientCompany("");
      setClientEmail("");
      setClientAddress("");
      return;
    }
    setClientId(id);
    const client = allClients.find((c) => c.id === id);
    if (client) {
      setClientName(client.name);
      setClientCompany(client.company ?? "");
      setClientEmail(client.email ?? "");
      const addr = [client.address, client.city, client.state, client.country]
        .filter(Boolean)
        .join(", ");
      setClientAddress(addr);
    }
  }

  function handleIssueDateChange(val: string) {
    setIssueDate(val);
    setDueDate(addDaysToDate(val, paymentTermsToDays(paymentTerms)));
  }

  function handlePaymentTermsChange(val: string | null) {
    if (!val) return;
    setPaymentTerms(val);
    setDueDate(addDaysToDate(issueDate, paymentTermsToDays(val)));
  }

  const previewPayload: InvoicePreviewPayload = {
    invoiceNumber: "PREVIEW",
    issueDate,
    dueDate,
    status: "draft",
    business: {
      name: selectedBU?.name ?? "",
      address: selectedBU?.address ?? null,
      city: selectedBU?.city ?? null,
      state: selectedBU?.state ?? null,
      country: selectedBU?.country ?? null,
      phone: selectedBU?.phone ?? null,
      email: selectedBU?.email ?? null,
      taxId: selectedBU?.tax_id ?? null,
      bankName: selectedBU?.bank_name ?? null,
      accountHolderName: selectedBU?.account_holder_name ?? null,
      bankAccount: selectedBU?.bank_account_number ?? null,
      bankSwift: selectedBU?.bank_swift ?? null,
      bankIban: selectedBU?.bank_iban ?? null,
      logoUrl: selectedBU?.logo_url ?? null,
      brandColor: selectedBU?.brand_color ?? "#000000",
      taxLabel: selectedBU?.tax_label ?? "Tax",
      footerLegalText: selectedBU?.footer_legal_text ?? null,
    },
    client: {
      name: clientName,
      company: clientCompany || null,
      email: clientEmail || null,
      address: clientAddress || null,
    },
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
    })),
    subtotal: totals.subtotal,
    discountType,
    discountValue,
    discountAmount: totals.discountAmount,
    taxRate,
    taxLabel: selectedBU?.tax_label ?? "Tax",
    taxAmount: totals.taxAmount,
    total: totals.total,
    currency,
    notes: notes || null,
    paymentTerms,
  };

  function validate() {
    const errs: string[] = [];
    if (!buId) errs.push("Select a business unit.");
    if (!clientName.trim()) errs.push("Client name is required.");
    if (!issueDate) errs.push("Issue date is required.");
    if (!dueDate) errs.push("Due date is required.");
    if (items.some((i) => !i.description.trim())) {
      errs.push("All line items must have a description.");
    }
    if (items.some((i) => i.quantity <= 0)) {
      errs.push("All quantities must be greater than 0.");
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);

    startTransition(async () => {
      const response = await fetch("/dashboard/invoices/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        business_unit_id: buId,
        client_id: clientId || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        client_name: clientName,
        client_company: clientCompany || undefined,
        client_email: clientEmail || undefined,
        client_address: clientAddress || undefined,
        discount_type: discountType,
        discount_value: discountValue,
        payment_terms: paymentTerms,
        notes: notes || undefined,
        items: items.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.quantity * item.unitPrice,
          sort_order: i,
        })),
      })
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; id?: string }
        | null;

      if (!response.ok || result?.error) {
        appToast.error("Failed to create invoice", { description: result?.error ?? "Request failed." });
      } else if (result?.id) {
        router.push(`/dashboard/invoices/${result.id}`);
      }
    });
  }

  const FormPanel = (
    <div className="space-y-8">

      {/* ── Business Unit ─────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={Building01Icon} strokeWidth={2} className="size-4" />}
          title="Business Unit"
          subtitle="The entity issuing this invoice"
        />
        <FieldGroup>
          {businessUnits.length === 0 ? (
            <p className="text-sm text-destructive">
              No business units found.{" "}
              <a className="underline font-medium" href="/dashboard/business-units/new">
                Create one first.
              </a>
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Select Business Unit
              </Label>
              <BusinessUnitCombobox
                businessUnits={businessUnits}
                value={buId}
                onValueChange={handleBUChange}
                placeholder="Search business units..."
                emptyText="No matching business units."
              />
              {selectedBU && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedBU.default_currency && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {selectedBU.default_currency}
                    </span>
                  )}
                  {selectedBU.default_tax_rate > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {selectedBU.tax_label ?? "Tax"} {selectedBU.default_tax_rate}%
                    </span>
                  )}
                  {selectedBU.payment_terms && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {selectedBU.payment_terms}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </FieldGroup>
      </section>

      {/* ── Client ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} className="size-4" />}
          title="Bill To"
          subtitle="Select from your directory or enter manually"
        />
        <FieldGroup className="space-y-3">
          {buClients.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                From Directory
              </Label>
              <ClientCombobox
                clients={buClients}
                value={clientId}
                onValueChange={handleClientSelect}
                placeholder="Select or enter manually"
                emptyText="No matching clients."
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientCompany" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Company
              </Label>
              <Input
                id="clientCompany"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="clientEmail" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientAddress" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Address
              </Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="Street, City, Country"
              />
            </div>
          </div>
        </FieldGroup>
      </section>

      {/* ── Dates & Terms ──────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4" />}
          title="Dates & Terms"
          subtitle="Invoice period and payment deadline"
        />
        <FieldGroup>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="issueDate" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Issue Date <span className="text-primary">*</span>
              </Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Payment Terms
              </Label>
              <Select value={paymentTerms} onValueChange={handlePaymentTermsChange} items={PAYMENT_TERMS_OPTIONS}>
                <SelectTrigger className="w-full h-12!">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Due Date <span className="text-primary">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </FieldGroup>
      </section>

      {/* ── Line Items ─────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={NoteEditIcon} strokeWidth={2} className="size-4" />}
          title="Line Items"
          subtitle="Products or services for this invoice"
        />
        <div className="pt-4">
          <LineItemsEditor items={items} currency={currency} onChange={setItems} />
        </div>
      </section>

      {/* ── Totals ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={PercentCircleIcon} strokeWidth={2} className="size-4" />}
          title="Totals & Discount"
          subtitle="Apply a discount and review the final amount"
        />
        <FieldGroup>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5 sm:flex-1 relative lg:top-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Discount Type
              </Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                items={[{ value: "percentage", label: "% Discount" }, { value: "fixed", label: "Fixed Discount" }]}
              >
                <SelectTrigger className="w-full h-12!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage" label="% Discount">% Discount</SelectItem>
                  <SelectItem value="fixed" label="Fixed Discount">Fixed Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:w-32">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Amount
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full text-right font-mono"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border/60 bg-muted/40 overflow-hidden">
            <div className="divide-y divide-border/60">
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-mono tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-sm text-muted-foreground">
                    Discount {discountType === "percentage" ? `(${discountValue}%)` : ""}
                  </span>
                  <span className="text-sm font-mono tabular-nums text-destructive">
                    −{formatCurrency(totals.discountAmount, currency)}
                  </span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-sm text-muted-foreground">
                    {selectedBU?.tax_label ?? "Tax"} ({taxRate}%)
                  </span>
                  <span className="text-sm font-mono tabular-nums">{formatCurrency(totals.taxAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 bg-primary/5">
                <span className="text-sm font-semibold">Total Due</span>
                <span className="text-base font-bold font-mono tabular-nums text-primary">
                  {formatCurrency(totals.total, currency)}
                </span>
              </div>
            </div>
          </div>
        </FieldGroup>
      </section>

      {/* ── Notes ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card shadow-xs px-5 py-5">
        <SectionHeader
          icon={<HugeiconsIcon icon={NoteEditIcon} strokeWidth={2} className="size-4" />}
          title="Notes"
          subtitle="Payment instructions, thanks, or extra details"
        />
        <FieldGroup>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Please pay within 30 days. Thank you for your business."
            rows={3}
            className="resize-none text-sm"
          />
        </FieldGroup>
      </section>

      {/* ── Errors ─────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4 text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">Please fix the following:</span>
          </div>
          <ul className="space-y-0.5 pl-6 list-disc">
            {errors.map((e) => (
              <li key={e} className="text-sm text-destructive">{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Action ─────────────────────────────────────────── */}
      <Button
        onClick={handleSave}
        disabled={isPending || !buId}
        size="lg"
        className="w-full gap-2 font-semibold"
      >
        <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-4" />
        {isPending ? "Creating invoice…" : "Create Invoice"}
      </Button>
    </div>
  );

  const PreviewPanel = (
    <div className="sticky top-4 min-w-0">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
        Live Preview
      </div>
      <InvoiceTemplate payload={previewPayload} variant="preview" />
    </div>
  );

  return (
    <>
      {/* Desktop: side-by-side */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_420px] gap-10 items-start">
        <div className="min-w-0">{FormPanel}</div>
        <div className="min-w-0">{PreviewPanel}</div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="form">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="form" className="flex-1 gap-1.5">
              <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} className="size-3.5" />
              Form
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 gap-1.5">
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="form">{FormPanel}</TabsContent>
          <TabsContent value="preview">{PreviewPanel}</TabsContent>
        </Tabs>
      </div>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  DEFAULT_PAYMENT_TERMS,
  PAYMENT_TERMS_OPTIONS,
  type BusinessUnit,
} from "@/lib/types/invoice";
import { appToast } from "@/components/custom/toast-ui";
import { ImageUpload } from "@/components/custom/image-upload";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const CURRENCIES = [
  { value: "NGN", label: "NGN - Nigerian Naira" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "INR", label: "INR - Indian Rupee" },
];

const DEFAULT_BRAND_COLOR = "#000000";

const emptyToNull = (v: string | undefined | null, o: string | undefined | null) => (o === "" ? null : v);

const businessUnitSchema = yup.object().shape({
  name: yup.string().required("Business Name is required"),
  code: yup.string().required("Code is required").max(10, "Max 10 characters"),
  category: yup.string().optional(),
  website: yup.string().nullable().transform(emptyToNull).url("Must be a valid URL").optional(),

  address: yup.string().optional(),
  city: yup.string().optional(),
  state: yup.string().optional(),
  country: yup.string().optional(),
  postal_code: yup.string().optional(),
  phone: yup.string().optional(),
  email: yup.string().nullable().transform(emptyToNull).email("Must be a valid email").optional(),

  tax_id: yup.string().optional(),
  registration_number: yup.string().optional(),
  tax_label: yup.string().required("Tax label is required").default("Tax"),
  default_tax_rate: yup.number().typeError("Must be a number").min(0).max(100).default(0),
  default_currency: yup.string().required("Currency is required").default("NGN"),
  payment_terms: yup.string().default(DEFAULT_PAYMENT_TERMS),

  bank_name: yup.string().optional(),
  account_holder_name: yup.string().optional(),
  bank_account_number: yup.string().optional(),
  bank_routing_number: yup.string().optional(),
  bank_swift: yup.string().optional(),
  bank_iban: yup.string().optional(),

  logo_url: yup.string().nullable().transform(emptyToNull).url("Must be a valid URL").optional(),
  brand_color: yup.string().default("#000000"),

  footer_legal_text: yup.string().optional(),
  notes: yup.string().optional(),
});

interface BusinessUnitFormProps {
  /** Provide the business unit id to switch the form into edit mode. */
  id?: string;
  defaultValues?: BusinessUnit;
}

export function BusinessUnitForm({ id, defaultValues }: BusinessUnitFormProps) {
  const isEdit = Boolean(id);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | undefined>();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(businessUnitSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      code: defaultValues?.code ?? "",
      category: defaultValues?.category ?? "",
      website: defaultValues?.website ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      state: defaultValues?.state ?? "",
      country: defaultValues?.country ?? "",
      postal_code: defaultValues?.postal_code ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      tax_id: defaultValues?.tax_id ?? "",
      registration_number: defaultValues?.registration_number ?? "",
      tax_label: defaultValues?.tax_label ?? "Tax",
      default_tax_rate: defaultValues?.default_tax_rate ?? 0,
      default_currency: defaultValues?.default_currency ?? "NGN",
      payment_terms: defaultValues?.payment_terms ?? DEFAULT_PAYMENT_TERMS,
      bank_name: defaultValues?.bank_name ?? "",
      account_holder_name: defaultValues?.account_holder_name ?? "",
      bank_account_number: defaultValues?.bank_account_number ?? "",
      bank_routing_number: defaultValues?.bank_routing_number ?? "",
      bank_swift: defaultValues?.bank_swift ?? "",
      bank_iban: defaultValues?.bank_iban ?? "",
      logo_url: defaultValues?.logo_url ?? "",
      brand_color: defaultValues?.brand_color ?? DEFAULT_BRAND_COLOR,
      footer_legal_text: defaultValues?.footer_legal_text ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  const brandColor =
    useWatch({ control, name: "brand_color" }) || DEFAULT_BRAND_COLOR;
  const paymentTerms = useWatch({ control, name: "payment_terms" }) || DEFAULT_PAYMENT_TERMS;
  const paymentTermOptions = PAYMENT_TERMS_OPTIONS.some((option) => option.value === paymentTerms)
    ? PAYMENT_TERMS_OPTIONS
    : [...PAYMENT_TERMS_OPTIONS, { value: paymentTerms, label: paymentTerms }];

  const onSubmit = (data: yup.InferType<typeof businessUnitSchema>) => {
    startTransition(async () => {
      let logoUrl = data.logo_url ?? "";

      // Upload logo file to Supabase storage first if the user selected one.
      if (logoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", logoFile);
        // Pass the old path so the server can clean up the previous image.
        if (defaultValues?.logo_url) {
          // Extract the storage path from the full public URL.
          const urlPath = new URL(defaultValues.logo_url).pathname;
          const storagePath = urlPath.replace(/^\/storage\/v1\/object\/public\/logos\//, "");
          if (storagePath) uploadFormData.append("oldPath", storagePath);
        }
        const response = await fetch("/dashboard/business-units/logo/api", {
          method: "POST",
          body: uploadFormData,
        });
        const result = (await response.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (!response.ok || result?.error) {
          appToast.error("Logo upload failed", { description: result?.error ?? "Request failed." });
          return;
        }
        logoUrl = result?.url ?? "";
      }

      const payload: Record<string, unknown> = {};
      Object.entries({ ...data, logo_url: logoUrl || undefined }).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload[key] = value;
        }
      });

      const endpoint = isEdit
        ? `/dashboard/business-units/${id}/api`
        : "/dashboard/business-units/api";
      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok || result?.error) {
        setServerError(result?.error ?? "Something went wrong. Please try again.");
      } else {
        router.push("/dashboard/business-units");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl pb-16">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and code identify this unit across all invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" placeholder="e.g. Acme IT Solutions" {...register("name")} />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input id="code" placeholder="e.g. IT" className="uppercase" maxLength={10} {...register("code")} />
            <p className="text-[11px] text-muted-foreground">Used in invoice numbers</p>
            {errors.code && <p className="text-[11px] text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" placeholder="IT, Real Estate, Finance…" {...register("category")} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://example.com" {...register("website")} />
            {errors.website && <p className="text-[11px] text-destructive">{errors.website.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Address</CardTitle>
          <CardDescription>Primary contact details and billing address for your business.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" placeholder="123 Main St" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" placeholder="Lagos" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input id="state" placeholder="Lagos State" {...register("state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" placeholder="Nigeria" {...register("country")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input id="postal_code" placeholder="100001" {...register("postal_code")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="billing@example.com" {...register("email")} />
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax & Financial Settings</CardTitle>
          <CardDescription>Default rates and identifiers applied to your invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input id="tax_id" placeholder="VAT-12345" {...register("tax_id")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration Number</Label>
            <Input id="registration_number" placeholder="RC-00001" {...register("registration_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_label">Tax Label</Label>
            <Input id="tax_label" placeholder="VAT, GST, WHT…" {...register("tax_label")} />
            {errors.tax_label && <p className="text-[11px] text-destructive">{errors.tax_label.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
            <Input id="default_tax_rate" type="number" step="0.01" {...register("default_tax_rate")} />
            {errors.default_tax_rate && <p className="text-[11px] text-destructive">{errors.default_tax_rate.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_terms">Default Payment Terms</Label>
            <Controller
              control={control}
              name="payment_terms"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} items={paymentTermOptions}>
                  <SelectTrigger id="payment_terms" className="w-full h-12!">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTermOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} label={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_currency">
              Default Currency <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="default_currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="default_currency" className="w-full h-12!">
                    <SelectValue placeholder="Select Currency">
                      {(stateOrValue: string | { value: string } | undefined) => {
                        const val = typeof stateOrValue === "object" && stateOrValue !== null && "value" in stateOrValue ? stateOrValue.value : stateOrValue;
                        if (!val) return "Select Currency";
                        return CURRENCIES.find((c) => c.value === val)?.label || val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.default_currency && <p className="text-[11px] text-destructive">{errors.default_currency.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
          <CardDescription>Where your clients should send their payments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="account_holder_name">Account Holder Name</Label>
            <Input id="account_holder_name" placeholder="John Doe" {...register("account_holder_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input id="bank_name" placeholder="First National Bank" {...register("bank_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_number">Account Number</Label>
            <Input id="bank_account_number" placeholder="0000000000" {...register("bank_account_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_routing_number">Routing Number</Label>
            <Input id="bank_routing_number" placeholder="ABA / Sort code" {...register("bank_routing_number")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_swift">SWIFT / BIC</Label>
            <Input id="bank_swift" placeholder="FNBKNGLA" {...register("bank_swift")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_iban">IBAN</Label>
            <Input id="bank_iban" placeholder="NG12 FNBK 0000 0000 0000 00" {...register("bank_iban")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding & Defaults</CardTitle>
          <CardDescription>Personalize the appearance and boilerplate of your invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Controller
              control={control}
              name="logo_url"
              render={({ field }) => (
                <ImageUpload
                  label="Business Logo"
                  description="Upload from your device or paste a URL. Displays on all invoices."
                  previewClassName="h-44 w-full"
                  value={field.value ?? ""}
                  onValueChange={(url) => {
                    field.onChange(url);
                    if (url) setLogoFile(null);
                  }}
                  file={logoFile}
                  onFileChange={(file) => {
                    setLogoFile(file);
                    // Clear the URL field when a local file is chosen
                    if (file) field.onChange("");
                  }}
                  showUrlField={true}
                  urlLabel="Or paste a logo URL"
                  urlPlaceholder="https://cdn.example.com/logo.png"
                  previewAlt="Business logo preview"
                  enableCamera={false}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                />
              )}
            />
            {errors.logo_url && <p className="text-[11px] text-destructive">{errors.logo_url.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_color">Brand Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                title="Choose a colour"
                id="brand_color"
                className="h-9 w-12 rounded cursor-pointer border border-input"
                value={brandColor}
                onChange={(event) => {
                  setValue("brand_color", event.target.value.toUpperCase(), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              <Input
                value={brandColor}
                onChange={(event) => {
                  const nextValue = event.target.value.toUpperCase();
                  setValue(
                    "brand_color",
                    nextValue === "" ? DEFAULT_BRAND_COLOR : nextValue,
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                }}
                placeholder="#000000"
                className="font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setValue("brand_color", DEFAULT_BRAND_COLOR, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                Default
              </Button>
            </div>
            {errors.brand_color && <p className="text-[11px] text-destructive">{errors.brand_color.message}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="footer_legal_text">Footer / Legal Text</Label>
            <Textarea
              id="footer_legal_text"
              placeholder="© 2026 Acme Inc. Registered in Nigeria. RC 000001."
              rows={2}
              {...register("footer_legal_text")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Internal notes not shown on invoices."
              rows={2}
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4 py-4">
        <Button variant="outline" render={<Link href="/dashboard/business-units" />}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Business Unit"}
        </Button>
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}
    </form>
  );
}

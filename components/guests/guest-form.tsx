"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { appToast } from "@/lib/toast";
import { guestSchema, type BusinessUnit, type GuestWithImageUrl, type PublicGuestFormBusinessUnit } from "@/lib/types/invoice";
import { buildGuestIdentificationImagePath, GUEST_IDENTIFICATION_BUCKET, uploadCompressedImageToSupabase } from "@/lib/upload/images";
import { BusinessUnitCombobox } from "@/components/custom/business-unit-combobox";
import { ImageUpload } from "@/components/custom/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const genderOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const identificationOptions = [
  { value: "passport", label: "Passport" },
  { value: "drivers-license", label: "Driver's License" },
  { value: "national-id", label: "National ID" },
  { value: "voters-card", label: "Voter's Card" },
  { value: "residence-permit", label: "Residence Permit" },
  { value: "other", label: "Other" },
];

type GuestFormValues = {
  business_unit_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  birthday?: string;
  gender: "female" | "male" | "non-binary" | "prefer-not-to-say";
  nationality: string;
  identification_type: "passport" | "drivers-license" | "national-id" | "voters-card" | "residence-permit" | "other" | "";
  identification_number?: string;
  identification_image_path?: string;
  emergency_contact: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

const GUEST_FORM_DRAFT_STORAGE_KEY = "guest-form-draft";

function getGuestFormDraftStorageKey(options: {
  mode: "public" | "dashboard";
  id?: string;
  publicSlug?: string;
  businessUnitId?: string;
}) {
  return [
    GUEST_FORM_DRAFT_STORAGE_KEY,
    options.mode,
    options.id ?? "new",
    options.publicSlug ?? "no-slug",
    options.businessUnitId ?? "no-business-unit",
  ].join(":");
}

function buildDraftValues(values: GuestFormValues): GuestFormValues {
  return {
    business_unit_id: values.business_unit_id,
    first_name: values.first_name,
    last_name: values.last_name,
    phone_number: values.phone_number,
    email: values.email,
    birthday: values.birthday ?? "",
    gender: values.gender,
    nationality: values.nationality,
    identification_type: values.identification_type,
    identification_number: values.identification_number ?? "",
    identification_image_path: values.identification_image_path ?? "",
    emergency_contact: values.emergency_contact,
    notes: values.notes ?? "",
    metadata: values.metadata,
  };
}

function buildPayload(values: GuestFormValues, uploadedPath?: string) {
  const entries = Object.entries({
    ...values,
    identification_image_path: uploadedPath ?? values.identification_image_path,
  }).filter(([, value]) => value !== undefined && value !== null && value !== "");

  return Object.fromEntries(entries);
}

export function GuestForm({
  mode,
  id,
  defaultValues,
  businessUnits = [],
  publicBusinessUnit,
  initialBusinessUnitId,
}: {
  mode: "public" | "dashboard";
  id?: string;
  defaultValues?: GuestWithImageUrl | null;
  businessUnits?: BusinessUnit[];
  publicBusinessUnit?: PublicGuestFormBusinessUnit;
  initialBusinessUnitId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isOffline, setIsOffline] = useState(() =>
    typeof window !== "undefined" ? !window.navigator.onLine : false
  );
  const hasLoadedDraftRef = useRef(false);
  const hasShownInitialOfflineToastRef = useRef(false);

  const writableBusinessUnits = useMemo(
    () => businessUnits.filter((businessUnit) => businessUnit.current_user_can_manage),
    [businessUnits]
  );

  const guestFormSchema = guestSchema.extend({
    identification_image_path: z.string().optional(),
  }).superRefine((values, ctx) => {
    if (!values.identification_image_path && !imageFile) {
      ctx.addIssue({
        code: "custom",
        path: ["identification_image_path"],
        message: "Identification image is required",
      });
    }
  });

  const guestFormResolver = zodResolver(guestFormSchema) as Resolver<GuestFormValues>;

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GuestFormValues>({
    resolver: guestFormResolver,
    defaultValues: {
      business_unit_id:
        defaultValues?.business_unit_id ??
        publicBusinessUnit?.id ??
        initialBusinessUnitId ??
        writableBusinessUnits[0]?.id ??
        "",
      first_name: defaultValues?.first_name ?? "",
      last_name: defaultValues?.last_name ?? "",
      phone_number: defaultValues?.phone_number ?? "",
      email: defaultValues?.email ?? "",
      birthday: defaultValues?.birthday ?? "",
      gender: (defaultValues?.gender as GuestFormValues["gender"]) ?? "female",
      nationality: defaultValues?.nationality ?? "",
      identification_type: (defaultValues?.identification_type as GuestFormValues["identification_type"]) ?? "",
      identification_number: defaultValues?.identification_number ?? "",
      identification_image_path: defaultValues?.identification_image_path ?? "",
      emergency_contact: defaultValues?.emergency_contact ?? "",
    },
  });

  const selectedBusinessUnitId = useWatch({ control, name: "business_unit_id" });
  const watchedValues = useWatch({ control });
  const selectedBusinessUnit =
    mode === "public"
      ? publicBusinessUnit
      : writableBusinessUnits.find((businessUnit) => businessUnit.id === selectedBusinessUnitId) ?? null;
  const draftStorageKey = useMemo(
    () =>
      getGuestFormDraftStorageKey({
        mode,
        id,
        publicSlug: publicBusinessUnit?.public_guest_form_slug,
        businessUnitId: publicBusinessUnit?.id ?? initialBusinessUnitId ?? defaultValues?.business_unit_id,
      }),
    [defaultValues?.business_unit_id, id, initialBusinessUnitId, mode, publicBusinessUnit?.id, publicBusinessUnit?.public_guest_form_slug]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasLoadedDraftRef.current) return;

    try {
      const savedDraft = window.localStorage.getItem(draftStorageKey);
      if (!savedDraft) {
        hasLoadedDraftRef.current = true;
        return;
      }

      const parsedDraft = JSON.parse(savedDraft) as Partial<GuestFormValues>;

      reset({
        business_unit_id:
          parsedDraft.business_unit_id ??
          defaultValues?.business_unit_id ??
          publicBusinessUnit?.id ??
          initialBusinessUnitId ??
          writableBusinessUnits[0]?.id ??
          "",
        first_name: parsedDraft.first_name ?? defaultValues?.first_name ?? "",
        last_name: parsedDraft.last_name ?? defaultValues?.last_name ?? "",
        phone_number: parsedDraft.phone_number ?? defaultValues?.phone_number ?? "",
        email: parsedDraft.email ?? defaultValues?.email ?? "",
        birthday: parsedDraft.birthday ?? defaultValues?.birthday ?? "",
        gender:
          (parsedDraft.gender as GuestFormValues["gender"] | undefined) ??
          (defaultValues?.gender as GuestFormValues["gender"] | undefined) ??
          "female",
        nationality: parsedDraft.nationality ?? defaultValues?.nationality ?? "",
        identification_type:
          (parsedDraft.identification_type as GuestFormValues["identification_type"] | undefined) ??
          (defaultValues?.identification_type as GuestFormValues["identification_type"] | undefined) ??
          "",
        identification_number:
          parsedDraft.identification_number ?? defaultValues?.identification_number ?? "",
        identification_image_path:
          parsedDraft.identification_image_path ?? defaultValues?.identification_image_path ?? "",
        emergency_contact: parsedDraft.emergency_contact ?? defaultValues?.emergency_contact ?? "",
        notes: parsedDraft.notes ?? defaultValues?.notes ?? "",
        metadata: parsedDraft.metadata,
      });
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    } finally {
      hasLoadedDraftRef.current = true;
    }
  }, [
    defaultValues?.birthday,
    defaultValues?.business_unit_id,
    defaultValues?.email,
    defaultValues?.emergency_contact,
    defaultValues?.first_name,
    defaultValues?.gender,
    defaultValues?.identification_image_path,
    defaultValues?.identification_number,
    defaultValues?.identification_type,
    defaultValues?.last_name,
    defaultValues?.nationality,
    defaultValues?.notes,
    defaultValues?.phone_number,
    draftStorageKey,
    initialBusinessUnitId,
    publicBusinessUnit?.id,
    reset,
    writableBusinessUnits,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedDraftRef.current) return;

    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(buildDraftValues(watchedValues as GuestFormValues)));
    } catch {
      // Ignore storage write failures.
    }
  }, [draftStorageKey, watchedValues]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const showOfflineToast = () => {
      appToast.warning("No network", {
        description: "Your guest form draft is being kept locally until your connection returns.",
      });
    };

    if (!window.navigator.onLine && !hasShownInitialOfflineToastRef.current) {
      hasShownInitialOfflineToastRef.current = true;
      setIsOffline(true);
      showOfflineToast();
    }

    const handleOffline = () => {
      setIsOffline(true);
      hasShownInitialOfflineToastRef.current = true;
      showOfflineToast();
    };

    const handleOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setServerError(undefined);

      if (typeof window !== "undefined" && !window.navigator.onLine) {
        const message = "No network connection. Your draft is saved locally.";
        setServerError(message);
        appToast.warning("No network", {
          description: "Your guest form draft is saved locally. Reconnect and submit again.",
        });
        return;
      }

      let identificationImagePath = values.identification_image_path;

      if (imageFile) {
        if (!selectedBusinessUnit?.public_guest_form_slug) {
          const message = "This business unit needs a public guest form slug before an ID image can be uploaded.";
          setServerError(message);
          setError("identification_image_path", { message });
          return;
        }

        try {
          const uploadResult = await uploadCompressedImageToSupabase({
            file: imageFile,
            bucket: GUEST_IDENTIFICATION_BUCKET,
            path: buildGuestIdentificationImagePath({
              businessUnitId: values.business_unit_id,
              publicSlug: selectedBusinessUnit.public_guest_form_slug,
              fileName: imageFile.name,
            }),
            targetReduction: 0.2,
          });

          identificationImagePath = uploadResult.path;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Image upload failed.";
          setServerError(message);
          appToast.error(message);
          return;
        }
      }

      if (!identificationImagePath) {
        const message = "Identification image is required.";
        setServerError(message);
        setError("identification_image_path", { message });
        return;
      }

      const endpoint =
        mode === "public"
          ? `/walk-in-guest/${publicBusinessUnit?.public_guest_form_slug}/api`
          : id
            ? `/dashboard/guest-list/${id}/api`
            : "/dashboard/guest-list/api";

      const response = await fetch(endpoint, {
        method: mode === "public" || !id ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(values, identificationImagePath)),
      });

      const result = (await response.json().catch(() => null)) as
        | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
        | null;

      if (!response.ok || result?.error) {
        setServerError(result?.error ?? "Something went wrong. Please try again.");

        if (result?.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (!messages?.[0]) return;
            setError(field as keyof GuestFormValues, { message: messages[0] });
          });
        }
        return;
      }

      if (mode === "public") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(draftStorageKey);
        }
        setIsSuccess(true);
        reset({
          business_unit_id: publicBusinessUnit?.id ?? "",
          first_name: "",
          last_name: "",
          phone_number: "",
          email: "",
          birthday: "",
          gender: "female",
          nationality: "",
          identification_type: "",
          identification_number: "",
          identification_image_path: "",
          emergency_contact: "",
          notes: "",
          metadata: undefined,
        });
        setImageFile(null);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }

      appToast.success(id ? "Guest updated" : "Guest created");
      router.push("/dashboard/guest-list");
      router.refresh();
    });
  });

  if (mode === "public" && isSuccess) {
    return (
      <Card className="border-white/70 bg-white/92 sm:shadow-[0_24px_80px_rgba(26,20,12,0.12)]">
        <CardHeader>
          <CardTitle className="text-2xl">Guest details received</CardTitle>
          <CardDescription>
            Your information has been submitted to {publicBusinessUnit?.name}. The front desk can continue from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setIsSuccess(false)}>
            Submit another guest
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {isOffline ? (
        <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <p className="font-medium">No network connection</p>
          <p className="mt-1 text-xs text-amber-800">
            Your draft is being saved locally. Reconnect before submitting the form.
          </p>
        </div>
      ) : null}

      {mode === "dashboard" ? (
        <Card>
          <CardHeader>
            <CardTitle>Guest Assignment</CardTitle>
            <CardDescription>Choose the business unit that owns this guest record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="business_unit_id">Business Unit</Label>
            <BusinessUnitCombobox
              businessUnits={writableBusinessUnits}
              value={selectedBusinessUnitId}
              onValueChange={(value) => setValue("business_unit_id", value, { shouldDirty: true, shouldValidate: true })}
              id="business_unit_id"
              name="business_unit_id"
              ariaInvalid={Boolean(errors.business_unit_id)}
            />
            {errors.business_unit_id ? (
              <p className="text-[11px] text-destructive">{errors.business_unit_id.message}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="py-5 border-b border-muted">
        <CardHeader>
          <CardTitle>{mode === "public" ? "Walk-in Guest Form" : "Guest Information"}</CardTitle>
          <CardDescription>
            {mode === "public"
              ? `Submit guest details for ${publicBusinessUnit?.name}.`
              : "Capture the guest details your team needs for check-in and follow-up."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 mt-5">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" {...register("first_name")} />
            {errors.first_name ? <p className="text-[11px] text-destructive">{errors.first_name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" {...register("last_name")} />
            {errors.last_name ? <p className="text-[11px] text-destructive">{errors.last_name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number *</Label>
            <Input id="phone_number" type="tel" {...register("phone_number")} />
            {errors.phone_number ? <p className="text-[11px] text-destructive">{errors.phone_number.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email ? <p className="text-[11px] text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" {...register("birthday")} />
            {errors.birthday ? <p className="text-[11px] text-destructive">{errors.birthday.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} items={genderOptions}>
                  <SelectTrigger id="gender" className="h-12! w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} label={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.gender ? <p className="text-[11px] text-destructive">{errors.gender.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality *</Label>
            <Input id="nationality" {...register("nationality")} />
            {errors.nationality ? <p className="text-[11px] text-destructive">{errors.nationality.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact">Emergency Contact *</Label>
            <Input id="emergency_contact" {...register("emergency_contact")} />
            {errors.emergency_contact ? <p className="text-[11px] text-destructive">{errors.emergency_contact.message}</p> : null}
          </div>
        </CardContent>
      </div>

      <div className="border-none">
        <CardHeader>
          <CardTitle>Means of Identification</CardTitle>
          <CardDescription>
            Add the type of ID, the reference number if available, and a captured image if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 mt-5">
          <div className="space-y-2">
            <Label htmlFor="identification_type">Means of Identification *</Label>
            <Controller
              control={control}
              name="identification_type"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value: string) => field.onChange(value || "")}
                  items={identificationOptions}
                >
                  <SelectTrigger id="identification_type" className="h-12! w-full">
                    <SelectValue placeholder="Select identification" />
                  </SelectTrigger>
                  <SelectContent>
                    {identificationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} label={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.identification_type ? <p className="text-[11px] text-destructive">{errors.identification_type.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="identification_number">Identification Number</Label>
            <Input id="identification_number" {...register("identification_number")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <ImageUpload
              label="Identification Image *"
              description="Use the camera or upload a clear image of the selected identification document."
              previewClassName="h-56 w-full"
              file={imageFile}
              onFileChange={(file) => {
                setImageFile(file);
                if (file) {
                  setValue("identification_image_path", "pending-upload", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                } else if (!defaultValues?.identification_image_path) {
                  setValue("identification_image_path", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
              value={defaultValues?.identification_image_url ?? ""}
              onValueChange={() => {
                // Public and dashboard flows use uploaded files for persistence.
              }}
              showUrlField={false}
              previewAlt="Identification image preview"
            />
            <p className="text-[11px] text-muted-foreground">
              Typed details are restored from local storage, but attached image files must be selected again after a refresh or browser restart.
            </p>
            {errors.identification_image_path ? <p className="text-[11px] text-destructive">{errors.identification_image_path.message}</p> : null}
          </div>
        </CardContent>
      </div>

      {serverError ? (
        <p className="text-sm text-destructive ml-5" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {mode === "dashboard" ? (
          <Button className={'mb-5'} variant="outline" render={<Link href="/dashboard/guest-list" />}>
            Cancel
          </Button>
        ) : null}
        <div className={'mr-5 mb-5'}>
          <Button type="submit" disabled={isPending} >
          {isPending ? "Saving…" : mode === "public" ? "Submit Guest" : id ? "Save Changes" : "Create Guest"}
        </Button>
        </div>
      </div>
    </form>
  );
}
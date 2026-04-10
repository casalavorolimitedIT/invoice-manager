"use client";

import { useMemo } from "react";
import type { BusinessUnit } from "@/lib/types/invoice";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type BusinessUnitOption = {
  value: string;
  label: string;
  name: string;
  code: string;
  category: string;
  currency: string;
};

interface BusinessUnitComboboxProps {
  businessUnits: BusinessUnit[];
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  ariaInvalid?: boolean;
}

export function BusinessUnitCombobox({
  businessUnits,
  value,
  onValueChange,
  id,
  name,
  placeholder = "Search business units...",
  emptyText = "No business units found.",
  className,
  ariaInvalid = false,
}: BusinessUnitComboboxProps) {
  const options = useMemo<BusinessUnitOption[]>(
    () =>
      businessUnits.map((businessUnit) => ({
        value: businessUnit.id,
        label: `${businessUnit.name} (${businessUnit.code})`,
        name: businessUnit.name,
        code: businessUnit.code,
        category: businessUnit.category ?? "",
        currency: businessUnit.default_currency,
      })),
    [businessUnits]
  );

  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <>
      {name ? <input type="hidden" name={name} value={selectedOption?.value ?? ""} /> : null}
      <Combobox
        value={selectedOption}
        onValueChange={(nextValue) => onValueChange(nextValue?.value ?? "")}
        items={options}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          className={className ?? "h-12 w-full"}
          aria-invalid={ariaInvalid}
          autoComplete="off"
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{option.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.code}
                    {option.category ? ` · ${option.category}` : ""}
                    {option.currency ? ` · ${option.currency}` : ""}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </>
  );
}
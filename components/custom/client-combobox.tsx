"use client";

import { useMemo } from "react";
import type { Client } from "@/lib/types/invoice";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const MANUAL_ENTRY_VALUE = "__manual__";

type ClientOption = {
  value: string;
  label: string;
  name: string;
  company: string;
  email: string;
  isManual?: boolean;
};

interface ClientComboboxProps {
  clients: Client[];
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function ClientCombobox({
  clients,
  value,
  onValueChange,
  id,
  placeholder = "Select or enter manually",
  emptyText = "No matching clients.",
  className,
}: ClientComboboxProps) {
  const options = useMemo<ClientOption[]>(
    () => [
      {
        value: MANUAL_ENTRY_VALUE,
        label: "Enter manually",
        name: "Enter manually",
        company: "",
        email: "",
        isManual: true,
      },
      ...clients.map((client) => ({
        value: client.id,
        label: client.name + (client.company ? ` - ${client.company}` : ""),
        name: client.name,
        company: client.company ?? "",
        email: client.email ?? "",
      })),
    ],
    [clients]
  );

  const selectedValue = value || MANUAL_ENTRY_VALUE;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? null;

  return (
    <div className="w-full">
      <Combobox
        value={selectedOption}
        onValueChange={(nextValue) =>
          onValueChange(nextValue?.value === MANUAL_ENTRY_VALUE ? "" : (nextValue?.value ?? ""))
        }
        items={options}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          className={className ?? "h-12 w-full"}
          autoComplete="off"
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.isManual ? (
                  <span className="text-muted-foreground italic">Enter manually</span>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{option.name}</span>
                    {(option.company || option.email) && (
                      <span className="text-xs text-muted-foreground">
                        {option.company}
                        {option.company && option.email ? " - " : ""}
                        {option.email}
                      </span>
                    )}
                  </div>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignCircleIcon, Delete01Icon } from "@hugeicons/core-free-icons";
import { formatCurrency } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface LineItemsEditorProps {
  items: LineItem[];
  currency?: string;
  onChange: (items: LineItem[]) => void;
}

function newItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

export function LineItemsEditor({ items, currency = "USD", onChange }: LineItemsEditorProps) {
  function addItem() {
    onChange([...items, newItem()]);
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  return (
    <div className="w-full min-w-0 rounded-lg border border-border overflow-hidden">
      <div className="hidden md:block">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_80px_130px_110px_40px] gap-0 bg-muted/60 border-b border-border">
          <div className="px-3 py-2" />
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase">Description</div>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase text-right">Qty</div>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase text-right">Unit Price</div>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase text-right">Total</div>
          <div className="px-3 py-2" />
        </div>

        <div className="divide-y divide-border">
          {items.map((item, idx) => {
            const rowTotal = item.quantity * item.unitPrice;
            return (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[28px_minmax(0,1fr)_80px_130px_110px_40px] gap-0 items-center group transition-colors",
                  "hover:bg-accent/40"
                )}
              >
                <div className="flex items-center justify-center h-full py-2">
                  <span className="text-[10px] font-mono font-medium text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                    {idx + 1}
                  </span>
                </div>

                <div className="min-w-0 py-1.5 pr-2">
                  <Input
                    placeholder="Item description…"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    className="h-8 min-w-0 text-sm border bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:shadow-xs"
                  />
                </div>

                <div className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right border bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:shadow-xs font-mono"
                  />
                </div>

                <div className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm text-right border bg-transparent shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:shadow-xs font-mono"
                  />
                </div>

                <div className="py-1.5 pr-3 flex items-center justify-end">
                  <span className="text-xs font-semibold font-mono tabular-nums">
                    {formatCurrency(rowTotal, currency)}
                  </span>
                </div>

                <div className="py-1.5 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-100 transition-all disabled:opacity-0 cursor-pointer disabled:pointer-events-none"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    aria-label="Remove line item"
                  >
                    <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-border md:hidden">
        {items.map((item, idx) => {
          const rowTotal = item.quantity * item.unitPrice;
          return (
            <div key={item.id} className="space-y-3 bg-card px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono font-medium uppercase tracking-wide text-muted-foreground">
                  Item {idx + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  aria-label="Remove line item"
                >
                  <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </span>
                <Input
                  placeholder="Item description…"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  className="min-w-0 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Qty
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                    className="text-right font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Unit Price
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="text-right font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </span>
                <span className="text-sm font-semibold font-mono tabular-nums">
                  {formatCurrency(rowTotal, currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <div className="px-3 py-2.5 border-t border-border bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent px-2"
          onClick={addItem}
        >
          <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} className="size-3.5" />
          Add line item
        </Button>
      </div>
    </div>
  );
}

import type { InvoiceStatus, InvoicePreviewPayload } from "@/lib/types/invoice";
import { formatCurrency } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";
import SmartImage from "../custom/smart-images";
import Image from "next/image";

interface InvoiceTemplateProps {
  payload: InvoicePreviewPayload;
  variant?: "preview" | "print";
  elementId?: string;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
};

const STATUS_CLR: Record<InvoiceStatus, string> = {
  draft: "#71717a",
  sent: "#2563eb",
  paid: "#16a34a",
  overdue: "#dc2626",
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */

export function InvoiceTemplate({
  payload,
  variant = "preview",
  elementId,
}: InvoiceTemplateProps) {
  const {
    invoiceNumber,
    issueDate,
    dueDate,
    status,
    business,
    client,
    items,
    subtotal,
    discountAmount,
    discountValue,
    discountType,
    taxRate,
    taxLabel,
    taxAmount,
    total,
    paidAmount,
    balanceDue,
    currency,
    notes,
    paymentTerms,
  } = payload;

  const accent = business.brandColor || "#18181b";
  const isPrev = variant === "preview";
  const f = (v: number) => formatCurrency(v, currency);
  const showsBalanceDue = paidAmount > 0 || paymentTerms === "Balance Due";

  const addr = [
    business.address,
    [business.city, business.state].filter(Boolean).join(", ") || null,
    business.country,
  ].filter(Boolean);

  /* ── shared inline-style helpers (survive print) ── */
  const sectionLabel: React.CSSProperties = {
    fontSize: isPrev ? 9 : 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: accent,
    marginBottom: isPrev ? 8 : 12,
  };

  return (
    <div
      id={elementId}
      className={cn(
        "bg-white antialiased",
        isPrev
          ? "rounded-xl border border-zinc-200 shadow-sm overflow-y-auto"
          : "mx-auto w-full max-w-205 print:max-w-none print:shadow-none print:border-0",
      )}
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontSize: isPrev ? 11 : 14,
        lineHeight: isPrev ? 1.5 : 1.6,
        color: "#3f3f46",
        overflowWrap: "anywhere",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      } as React.CSSProperties}
    >
      <div style={{ padding: isPrev ? 20 : "40px 48px" }}>

        {/* ── accent strip ── */}
        <div style={{ height: 3, backgroundColor: accent, borderRadius: 2 }} />

        {/* ── HEADER ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginTop: isPrev ? 16 : 32,
          }}
        >
          {/* Left – logo / business info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {business.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  src={business.logoUrl}
                  alt={business.name}
                  crossOrigin="anonymous"
                  width={80}
                  height={80}
                  className={`${isPrev ? "h-7 w-7" : "h-20 w-20"}  aspect-square object-fill`}
                  style={{
                    height: isPrev ? 28 : 80,
                    objectFit: "contain",
                    objectPosition: "left",
                    marginBottom: isPrev ? 6 : 10,
                    display: "block",
                  }}
                />
                <div style={{ fontWeight: 600, color: "#18181b", fontSize: isPrev ? 13 : 18 }}>
                  {business.name}
                </div>
              </>
            ) : (
              <div style={{ fontWeight: 700, color: accent, fontSize: isPrev ? 15 : 24, lineHeight: 1.2 }}>
                {business.name}
              </div>
            )}
            <div style={{ color: "#71717a", marginTop: 4 }}>
              {addr.map((l) => (
                <div key={l as string}>{l}</div>
              ))}
              {business.phone && <div>{business.phone}</div>}
              {business.email && <div>{business.email}</div>}
              {business.taxId && (
                <div style={{ color: "#a1a1aa" }}>Tax ID: {business.taxId}</div>
              )}
            </div>
          </div>

          {/* Right – INVOICE title + number + status */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: isPrev ? 24 : 40,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: accent,
                lineHeight: 1,
              }}
            >
              INVOICE
            </div>
            <div style={{ fontWeight: 600, color: "#18181b", marginTop: 6, fontSize: isPrev ? 11 : 15 }}>
              {invoiceNumber || "PREVIEW"}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
              }}
            >
              <span
                style={{
                  width: isPrev ? 6 : 8,
                  height: isPrev ? 6 : 8,
                  borderRadius: "50%",
                  backgroundColor: STATUS_CLR[status],
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: isPrev ? 9 : 11,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: STATUS_CLR[status],
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  wordBreak: "keep-all",
                }}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
        </div>

        {/* ── INFO COLUMNS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: isPrev ? 14 : 24,
            marginTop: isPrev ? 16 : 28,
            paddingTop: isPrev ? 16 : 28,
            borderTop: "1px solid #e4e4e7",
          }}
        >
          {/* Invoice details (label → value pairs) */}
          <div>
            <div style={sectionLabel}>Invoice Details</div>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                {([
                  ["Issue Date", fmtDate(issueDate)],
                  ["Due Date", fmtDate(dueDate)],
                  ["Payment Terms", paymentTerms || "—"],
                  ["Currency", currency],
                ] as const).map(([label, val]) => (
                  <tr key={label}>
                    <td
                      style={{
                        paddingRight: isPrev ? 14 : 24,
                        paddingBottom: isPrev ? 4 : 6,
                        color: "#a1a1aa",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        paddingBottom: isPrev ? 4 : 6,
                        color: "#27272a",
                        fontWeight: 500,
                      }}
                    >
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bill To */}
          <div>
            <div style={sectionLabel}>Bill To</div>
            <div style={{ fontWeight: 600, color: "#18181b", fontSize: isPrev ? 12 : 16, lineHeight: 1.3 }}>
              {client.name || "—"}
            </div>
            {client.company && (
              <div style={{ color: "#52525b", marginTop: 2 }}>{client.company}</div>
            )}
            {client.address && (
              <div style={{ color: "#71717a", marginTop: 2 }}>{client.address}</div>
            )}
            {client.email && (
              <div style={{ color: "#71717a", marginTop: 2 }}>{client.email}</div>
            )}
          </div>
        </div>

        {/* ── LINE ITEMS ── */}
        <div style={{ marginTop: isPrev ? 16 : 28 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${accent}` }}>
                {(
                  [
                    { label: "Description", align: "left" as const },
                    { label: "Qty", align: "center" as const },
                    { label: "Rate", align: "right" as const },
                    { label: "Amount", align: "right" as const },
                  ] as const
                ).map(({ label, align }) => (
                  <th
                    key={label}
                    style={{
                      textAlign: align,
                      padding: isPrev ? "6px 8px" : "10px 12px",
                      fontSize: isPrev ? 8 : 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: accent,
                      width:
                        label === "Description"
                          ? "52%"
                          : label === "Qty"
                            ? "12%"
                            : "18%",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "#a1a1aa",
                      fontStyle: "italic",
                      padding: isPrev ? 16 : 32,
                    }}
                  >
                    No line items
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f4f4f5" }}>
                    <td
                      style={{
                        padding: isPrev ? "6px 8px" : "12px 12px",
                        color: "#27272a",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.description}
                    </td>
                    <td style={{ textAlign: "center", padding: isPrev ? "6px 6px" : "12px 12px", color: "#52525b" }}>
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: isPrev ? "6px 6px" : "12px 12px",
                        color: "#52525b",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f(item.unitPrice)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: isPrev ? "6px 8px" : "12px 12px",
                        color: "#18181b",
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {f(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: isPrev ? 12 : 20 }}>
          <div style={{ width: isPrev ? 180 : 320 }}>
            {/* Subtotal */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: isPrev ? "3px 0" : "5px 0", color: "#71717a" }}>
              <span>Subtotal</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: "#27272a" }}>{f(subtotal)}</span>
            </div>
            {/* Discount */}
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: isPrev ? "3px 0" : "5px 0", color: "#71717a" }}>
                <span>Discount{discountType === "percentage" ? ` (${discountValue}%)` : ""}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#dc2626" }}>−{f(discountAmount)}</span>
              </div>
            )}
            {/* Tax */}
            {taxRate > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: isPrev ? "3px 0" : "5px 0", color: "#71717a" }}>
                <span>{taxLabel} ({taxRate}%)</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#27272a" }}>{f(taxAmount)}</span>
              </div>
            )}
            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: isPrev ? 6 : 10,
                paddingTop: isPrev ? 6 : 10,
                borderTop: `2px solid ${accent}`,
                fontWeight: 700,
                fontSize: isPrev ? 13 : 18,
                color: accent,
              }}
            >
              <span>{showsBalanceDue ? "Total" : "Total Due"}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{f(total)}</span>
            </div>
            {paidAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: isPrev ? "5px 0 3px" : "8px 0 5px", color: "#71717a" }}>
                <span>Paid Amount</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#27272a" }}>{f(paidAmount)}</span>
              </div>
            )}
            {showsBalanceDue && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: paidAmount > 0 ? (isPrev ? 4 : 8) : 0,
                  paddingTop: isPrev ? 6 : 10,
                  borderTop: paidAmount > 0 ? "1px solid #e4e4e7" : undefined,
                  fontWeight: 700,
                  fontSize: isPrev ? 12 : 16,
                  color: accent,
                }}
              >
                <span>Balance Due</span>
                <span style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{f(balanceDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        {(notes || business.bankName || business.accountHolderName || business.bankAccount || business.bankSwift || business.bankIban) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPrev ? "1fr" : "1fr 1fr",
              gap: isPrev ? 14 : 24,
              marginTop: isPrev ? 16 : 28,
              paddingTop: isPrev ? 16 : 28,
              borderTop: "1px solid #e4e4e7",
            }}
          >
            {notes && (
              <div>
                <div style={sectionLabel}>Notes</div>
                <div
                  style={{
                    color: "#52525b",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {notes}
                </div>
              </div>
            )}
            {(business.bankName || business.accountHolderName || business.bankAccount || business.bankSwift || business.bankIban) && (
              <div>
                <div style={sectionLabel}>Payment Details</div>
                <div style={{ color: "#52525b", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                  {business.accountHolderName && (
                    <div><span style={{ color: "#a1a1aa" }}>Account Holder:</span> {business.accountHolderName}</div>
                  )}
                  {business.bankName && (
                    <div><span style={{ color: "#a1a1aa" }}>Bank:</span> {business.bankName}</div>
                  )}
                  {business.bankAccount && (
                    <div><span style={{ color: "#a1a1aa" }}>Account:</span> {business.bankAccount}</div>
                  )}
                  {business.bankSwift && (
                    <div><span style={{ color: "#a1a1aa" }}>SWIFT:</span> {business.bankSwift}</div>
                  )}
                  {business.bankIban && (
                    <div><span style={{ color: "#a1a1aa" }}>IBAN:</span> {business.bankIban}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEGAL FOOTER ── */}
        {business.footerLegalText && (
          <div
            style={{
              marginTop: isPrev ? 16 : 24,
              paddingTop: isPrev ? 12 : 16,
              borderTop: "1px solid #f4f4f5",
              textAlign: "center",
              color: "#a1a1aa",
              fontSize: isPrev ? 8 : 10,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {business.footerLegalText}
          </div>
        )}

        {/* ── bottom accent strip ── */}
        <div style={{ height: 3, backgroundColor: accent, borderRadius: 2, marginTop: isPrev ? 16 : 28 }} />
      </div>
    </div>
  );
}

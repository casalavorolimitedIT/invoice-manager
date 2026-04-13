"use client";

import { useState, useTransition } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/custom/DeleteModal";
import { appToast } from "@/lib/toast";
import { STATUS_LABELS, type InvoiceStatus } from "@/lib/types/invoice";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  CheckmarkCircle02Icon,
  Forward01Icon,
  Clock01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent"],
  sent: ["paid", "overdue"],
  overdue: ["paid", "sent"],
  paid: [],
};

const STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  draft: (
    <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
  ),
  sent: (
    <HugeiconsIcon icon={Forward01Icon} strokeWidth={2} className="size-3.5" />
  ),
  paid: (
    <HugeiconsIcon
      icon={CheckmarkCircle02Icon}
      strokeWidth={2}
      className="size-3.5"
    />
  ),
  overdue: (
    <HugeiconsIcon
      icon={AlertCircleIcon}
      strokeWidth={2}
      className="size-3.5"
    />
  ),
};

interface InvoiceActionsProps {
  id: string;
  invoiceNumber: string;
  currentStatus: InvoiceStatus;
  exportElementIds?: string[];
}

export function InvoiceActions({
  id,
  invoiceNumber,
  currentStatus,
  exportElementIds = ["invoice-document"],
}: InvoiceActionsProps) {
  const env = process.env.NODE_ENV || "development";
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function requestInvoiceUpdate(method: "PATCH" | "DELETE", body?: Record<string, string>) {
    const response = await fetch(`/dashboard/invoices/${id}/api`, {
      method,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; redirectTo?: string }
      | null;

    if (!response.ok) {
      return { error: payload?.error ?? "Request failed." };
    }

    return payload ?? {};
  }

  const transitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  function getInvoiceElement() {
    for (const elementId of exportElementIds) {
      const el = document.getElementById(elementId);
      if (el) return el;
    }

    appToast.error("Invoice export unavailable", {
      description: "The rendered invoice could not be found on this page.",
    });
    return null;
  }

  function buildFileName(extension: string) {
    const baseName = invoiceNumber.trim() || "invoice";
    return `${baseName.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "invoice"}.${extension}`;
  }

  /**
   * Pre-embeds every <img> inside `element` as a data-URL so that
   * html-to-image never has to fetch external resources (which causes
   * ProgressEvent rejections that bypass normal Error handling).
   *
   * Strategy per image:
   *   1. Draw the already-loaded live element onto a canvas (fast, no network).
   *   2. If the canvas is tainted (cross-origin without CORS), fetch fresh
   *      with mode:'cors' and convert via FileReader.
   *   3. If everything fails, remove the clone's <img> so the export still
   *      completes (logo simply won't appear in the PNG).
   */
  async function embedImagesAsDataUrls(
    clone: HTMLElement,
    live: HTMLElement,
  ): Promise<void> {
    const cloneImgs = Array.from(
      clone.querySelectorAll<HTMLImageElement>("img"),
    );
    const liveImgs = Array.from(live.querySelectorAll<HTMLImageElement>("img"));

    await Promise.all(
      cloneImgs.map(async (cloneImg, idx) => {
        const src = cloneImg.getAttribute("src");
        if (!src || src.startsWith("data:")) return;

        const liveImg = liveImgs[idx];

        // Attempt 1 – canvas draw from the already-loaded live element.
        if (liveImg?.complete && liveImg.naturalWidth > 0) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = liveImg.naturalWidth;
            canvas.height = liveImg.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(liveImg, 0, 0);
            cloneImg.src = canvas.toDataURL();
            cloneImg.removeAttribute("srcset");
            return;
          } catch {
            // Canvas was tainted – fall through to network fetch.
          }
        }

        // Attempt 2 – fresh CORS fetch with a cache-busting param.
        try {
          const cacheBustedSrc =
            src + (src.includes("?") ? "&" : "?") + "_dl=" + Date.now();
          const res = await fetch(cacheBustedSrc, {
            mode: "cors",
            cache: "no-store",
          });
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
          cloneImg.src = dataUrl;
          cloneImg.removeAttribute("srcset");
          return;
        } catch {
          // Network or CORS error – remove the element so the export still runs.
        }

        cloneImg.parentNode?.removeChild(cloneImg);
      }),
    );
  }

  async function handleDownloadImage() {
    const invoiceElement = getInvoiceElement();

    if (!invoiceElement) return;

    setIsExporting(true);

    // The export always renders at this width regardless of viewport size.
    const EXPORT_WIDTH = 820;

    try {
      const clone = invoiceElement.cloneNode(true) as HTMLElement;

      // Mount wrapper: fixed at top-left corner, exact EXPORT_WIDTH, invisible.
      // Must be IN the viewport so the browser actually paints the content.
      // Using a fixed-width (not flex) container avoids the mobile-viewport
      // shrink bug from earlier attempts.
      const mount = document.createElement("div");
      mount.style.cssText = [
        "position:fixed",
        "top:0",
        "left:0",
        `width:${EXPORT_WIDTH}px`,
        "opacity:0",
        "pointer-events:none",
        "overflow:visible",
        "z-index:99999",
      ].join(";");

      // Set only layout-critical overrides; do NOT touch cssText which would
      // wipe the inline styles already on the template root element.
      clone.style.position = "relative";
      clone.style.width = `${EXPORT_WIDTH}px`;
      clone.style.minWidth = `${EXPORT_WIDTH}px`;
      clone.style.maxWidth = "none";
      clone.style.margin = "0";
      clone.style.background = "#ffffff";
      clone.style.pointerEvents = "none";

      mount.appendChild(clone);
      document.body.appendChild(mount);

      try {
        await embedImagesAsDataUrls(clone, invoiceElement);

        // Two rAFs: first lets the browser parse/layout the appended node,
        // second ensures a full paint pass has completed.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const exportHeight = Math.max(
          Math.ceil(clone.scrollHeight),
          Math.ceil(clone.offsetHeight),
        );

        const exportOptions = {
          backgroundColor: "#ffffff",
          fontEmbedCSS: "",
          skipFonts: true,
          pixelRatio: 2,
          width: EXPORT_WIDTH,
          height: exportHeight,
          filter: (node: HTMLElement) =>
            !(node instanceof HTMLImageElement) || node.src.startsWith("data:"),
        };

        const dataUrl = await toPng(clone, exportOptions);

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = buildFileName("png");
        link.click();

        appToast.success("Invoice image downloaded");
      } finally {
        document.body.removeChild(mount);
      }
    } catch (err) {
      let description = "Could not generate the invoice image.";
      if (err instanceof Error) {
        description = err.message || description;
      } else if (err != null) {
        description = String(err);
      }
      appToast.error("Image download failed", { description });
    } finally {
      setIsExporting(false);
    }
  }

  async function waitForImages(win: Window) {
    await Promise.all(
      Array.from(win.document.images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }

            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );
  }

  function handlePrint() {
    const invoiceElement = getInvoiceElement();

    if (!invoiceElement) return;

    const printWindow = window.open("", "_blank", "width=1100,height=900");

    if (!printWindow) {
      appToast.error("Print window blocked", {
        description: "Allow pop-ups for this site, then try printing again.",
      });
      return;
    }

    const stylesheetMarkup = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${invoiceNumber}</title>
    ${stylesheetMarkup}
    <style>
      :root {
        color-scheme: light;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #ffffff;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      .invoice-print-root > * {
        max-width: none !important;
        min-height: auto !important;
        margin: 0 auto !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
    </style>
  </head>
  <body>
    <div class="invoice-print-root">${invoiceElement.outerHTML}</div>
  </body>
</html>`);
    printWindow.document.close();

    void waitForImages(printWindow).finally(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    });
  }

  function handleStatusChange(newStatus: InvoiceStatus) {
    startTransition(async () => {
      const result = await requestInvoiceUpdate("PATCH", { newStatus });
      if (result.error) {
        appToast.error("Status update failed", { description: result.error });
      } else {
        appToast.success(`Marked as ${STATUS_LABELS[newStatus]}`);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await requestInvoiceUpdate("DELETE");
      if (result?.error) {
        appToast.error("Delete failed", { description: result.error });
        setDeleteOpen(false);
      } else if (result?.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <Button
        size="sm"
        variant="outline"
        className="h-9 w-full text-xs sm:h-8 sm:w-auto"
        onClick={handlePrint}
        disabled={isPending || isExporting}
      >
        Print
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="h-9 w-full text-xs sm:h-8 sm:w-auto"
        onClick={handleDownloadImage}
        disabled={isPending || isExporting}
      >
        Download image
      </Button>

      {transitions.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "paid" ? "default" : "outline"}
          className="h-9 w-full gap-1.5 text-xs sm:h-8 sm:w-auto"
          onClick={() => handleStatusChange(next)}
          disabled={isPending}
        >
          {STATUS_ICONS[next]}
          Mark as {STATUS_LABELS[next]}
        </Button>
      ))}
      {env === "development" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:border-destructive sm:ml-auto sm:h-8 sm:w-auto"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending || isExporting}
          >
            <HugeiconsIcon
              icon={Delete01Icon}
              strokeWidth={2}
              className="size-3.5"
            />
            Delete
          </Button>
          <DeleteModal
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDelete}
            title="Delete Invoice"
            description={
              <>
                Permanently delete invoice <strong>{invoiceNumber}</strong>?
                This cannot be undone.
              </>
            }
            isLoading={isPending}
          />
        </>
      )}
    </div>
  );
}

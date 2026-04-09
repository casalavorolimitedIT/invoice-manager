"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

interface RelatedLink {
  label: string;
  href: string;
  description?: string;
}

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  relatedLinks?: RelatedLink[];
}

export function InfoModal({
  open,
  onOpenChange,
  title,
  description,
  relatedLinks,
}: InfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              strokeWidth={2}
              className="size-5 text-primary"
            />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              {description}
          </DialogDescription>
        </DialogHeader>

        {relatedLinks && relatedLinks.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Related pages
            </p>
            <ul className="space-y-1.5">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => onOpenChange(false)}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors text-sm"
                  >
                    <span className="font-medium text-primary">{link.label}</span>
                    {link.description && (
                      <span className="text-muted-foreground">
                        — {link.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Convenience trigger button — drop it anywhere in a page header
export function InfoModalTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Page information"
      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
    </button>
  );
}

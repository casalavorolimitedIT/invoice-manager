import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthFormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthFormShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthFormShellProps) {
  return (
    <Card className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white/88 py-0 shadow-[0_28px_90px_rgba(26,20,12,0.12)] ring-1 ring-orange-100/80 backdrop-blur-xl">
      <CardHeader className="gap-3 px-7 pt-7 md:px-8 md:pt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              {eyebrow}
            </p>
            <CardTitle className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 md:text-[2rem]">
              {title}
            </CardTitle>
          </div>
          <div className="rounded-full hidden md:block border border-orange-200/80 bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700">
            Invoice Manage
          </div>
        </div>
        <CardDescription className="max-w-md text-sm leading-6 text-zinc-600 md:text-[15px]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-7 pb-7 md:px-8 md:pb-8">
        {children}
        {footer ? (
          <div className="border-t border-zinc-200/80 pt-5 text-sm text-zinc-500">
            {footer}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200/80 pt-4 text-xs text-zinc-500">
          <span>Secure workspace access</span>
          <Link className="font-medium text-zinc-700 transition-colors hover:text-primary" href="/">
            Back to home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
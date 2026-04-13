import { requestPasswordReset } from "@/app/(auth)/actions/auth-actions";
import { AuthFormShell } from "@/app/(auth)/_components/auth-form-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, success } = await searchParams;

  return (
    <AuthFormShell
      eyebrow="Recovery"
      title="Reset password"
      description="We’ll email you a reset link."
      footer={
        <p>
          Back to{" "}
          <Link className="font-medium text-zinc-800 transition-colors hover:text-primary" href="/login">
            sign in
          </Link>
        </p>
      }
    >
      <form action={requestPasswordReset} className="space-y-5">
        <div className="grid gap-4 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              className="border-white bg-white"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            {success}
          </p>
        ) : null}

        <FormSubmitButton
          className="h-12 w-full rounded-2xl text-base font-medium shadow-[0_18px_38px_rgba(255,105,0,0.22)]"
          idleText="Send reset link"
          pendingText="Sending link..."
        />
      </form>
    </AuthFormShell>
  );
}

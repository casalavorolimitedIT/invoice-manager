import { register } from "@/app/(auth)/actions/auth-actions";
import { AuthFormShell } from "@/app/(auth)/_components/auth-form-shell";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

 const env = process.env.NODE_ENV; // Returns: 'development', 'production', or 'test'
  if (env !== "development") {
    redirect("/login");
  }
  return (
    <AuthFormShell
      eyebrow="Get started"
      title="Create account"
      description="Start using Invoice Manage."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-medium text-zinc-800 underline transition-colors hover:text-primary" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form action={register} className="space-y-5">
        <div className="grid gap-4 rounded-3xl border border-zinc-200/80 bg-zinc-50/80 p-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Your full name"
              className="border-white bg-white"
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Create a strong password"
              className="border-white bg-white"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <FormSubmitButton
          className="h-12 w-full rounded-2xl text-base font-medium shadow-[0_18px_38px_rgba(255,105,0,0.22)]"
          idleText="Create account"
          pendingText="Creating account..."
        />
      </form>
    </AuthFormShell>
  );
}

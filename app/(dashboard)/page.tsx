import { logout } from "@/app/(auth)/actions/auth-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>
          You are authenticated and ready to build your app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{data.user?.email}</span>
        </p>
        <form action={logout}>
          <FormSubmitButton
            variant="outline"
            idleText="Sign out"
            pendingText="Signing out..."
          />
        </form>
      </CardContent>
    </Card>
  );
}

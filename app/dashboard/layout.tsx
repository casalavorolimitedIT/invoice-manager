import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getBusinessUnitScope } from "@/lib/business-unit-scope";
import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";
import { getCurrentUserProfile } from "@/lib/supabase/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfNotAuthenticated();
  const { profile } = await getCurrentUserProfile();
  const { businessUnits, activeBusinessUnit, activeBusinessUnitId } = await getBusinessUnitScope({
    includeArchived: true,
  });

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        userProfile={profile}
        businessUnits={businessUnits}
        activeBusinessUnitId={activeBusinessUnitId}
        activeBusinessUnitName={activeBusinessUnit?.name ?? null}
      />
      {/* min-w-0: without it the flex item's automatic min-width lets wide
          tables stretch the whole pane instead of scrolling inside their own
          overflow container. */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}

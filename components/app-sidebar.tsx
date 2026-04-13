/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { BusinessUnitScopeSwitcher } from "@/components/custom/business-unit-scope-switcher"
import { filterRoleItems } from "@/lib/access-control"
import type { BusinessUnit } from "@/lib/types/invoice"
import type { CurrentUserProfile } from "@/lib/supabase/profile"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Invoice01Icon,
  UserGroupIcon,
  Building01Icon,
  Analytics01Icon,
} from "@hugeicons/core-free-icons"
import Link from "next/link"
import Image from "next/image"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />,
      allowedRoles: ["admin", "staff"] as const,
    },
    {
      title: "Invoices",
      url: "/dashboard/invoices",
      icon: <HugeiconsIcon icon={Invoice01Icon} strokeWidth={2} />,
      allowedRoles: ["admin", "staff"] as const,
    },
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
      allowedRoles: ["admin", "staff"] as const,
    },
    {
      title: "Business Units",
      url: "/dashboard/business-units",
      icon: <HugeiconsIcon icon={Building01Icon} strokeWidth={2} />,
      allowedRoles: ["admin"] as const,
    },
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />,
      allowedRoles: ["admin"] as const,
    },
  ],
  navSecondary: [
  ],
}

export function AppSidebar({
  userProfile,
  businessUnits,
  activeBusinessUnitId,
  activeBusinessUnitName,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  userProfile: CurrentUserProfile["profile"] | null;
  businessUnits: BusinessUnit[];
  activeBusinessUnitId: string | null;
  activeBusinessUnitName?: string | null;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const role = userProfile?.role ?? null;
  const navMainItems = filterRoleItems((data as any)?.navMain, role);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="space-y-3">
           <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5! mt-3 lg:mt-0 h-auto"
              render={<Link href="/dashboard" />}
              onClick={closeMobileSidebar}
            >
              <Image
                src="/casalavoro-logo.png"
                alt="Casalavoro Logo"
                width={200}
                height={20}
                className="object-contain relative top-1"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
          <BusinessUnitScopeSwitcher
           closeMobileSidebar={closeMobileSidebar}
            businessUnits={businessUnits}
            activeBusinessUnitId={activeBusinessUnitId}
            activeBusinessUnitName={activeBusinessUnitName}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems as any} role={role} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userProfile} />
      </SidebarFooter>
    </Sidebar>
  )
}

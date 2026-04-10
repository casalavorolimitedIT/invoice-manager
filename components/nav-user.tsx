"use client";


import { logout } from "@/app/(auth)/actions/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { filterRoleItems } from "@/lib/access-control";
import { CurrentUserProfile } from "@/lib/supabase/profile";

import {
  Analytics01Icon,
  Building01Icon,
  Invoice01Icon,
  Logout01Icon,
  MoreVerticalCircle01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

const userActions = [
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
];

function getInitials(name: string | null | undefined) {
  const normalizedName = name?.trim();

  if (!normalizedName) {
    return "CU";
  }

  return normalizedName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function NavUser({
  user,
}: {
  user: CurrentUserProfile["profile"] | null;
}) {
  const { isMobile } = useSidebar();
  const displayName = user?.full_name ?? user?.email ?? "Current user";
  const initials = getInitials(displayName);
  const visibleActions = filterRoleItems(userActions, user?.role ?? null);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage src="" alt={user?.full_name ?? user?.email ?? ""} />
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-foreground/70">
                {user?.email}
              </span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalCircle01Icon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={user?.avatar ?? ""}
                      alt={user?.full_name ?? user?.email ?? ""}
                    />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role === "admin" ? "Admin" : "Staff"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {visibleActions.length > 0 ? (
              <>
                <DropdownMenuGroup>
                  {visibleActions.map((action) => (
                    <DropdownMenuItem
                      key={action.title}
                      render={<Link href={action.url} />}
                    >
                      {action.icon}
                      {action.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem>
              <form action={logout} className="w-full">
                <button
                  type="submit"
                  className="w-full text-left flex justify-start items-center gap-2"
                >
                  <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                  Log out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

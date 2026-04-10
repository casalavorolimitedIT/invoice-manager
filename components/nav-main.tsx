"use client"

import type { ProfileRole } from "@/lib/supabase/profile"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignCircleIcon, Mail01Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
  role,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
  role?: ProfileRole | null
}) {
  const pathname = usePathname()
  const bestMatch = items
    .filter(
      (i) => i.url !== "#" && 
      (pathname === i.url || pathname.startsWith(i.url + "/"))
    )
    .sort((a, b) => b.url.length - a.url.length)[0]
  const canCreateInvoice = role === "admin" || role === "staff" || !role

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {canCreateInvoice ? (
            <SidebarMenuItem className="flex items-center gap-2">
              <SidebarMenuButton
                tooltip="New Invoice"
                className="min-w-8 bg-primary text-white duration-200 ease-linear hover:bg-primary/90 hover:text-white/90 active:bg-primary/90 active:text-white group-data-[collapsible=icon]:opacity-0"
                render={<Link href="/dashboard/invoices/new" />}
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} strokeWidth={2} />
                <span>New Invoice</span>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="size-8 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
                render={<Link href="/dashboard/invoices" />}
              >
                <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} />
                <span className="sr-only">Invoices</span>
              </Button>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
           const isActive = bestMatch?.url === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  render={item.url !== "#" ? <Link href={item.url} /> : undefined}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

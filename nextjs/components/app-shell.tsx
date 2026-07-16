"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ActivityIcon,
  ClipboardCheckIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/better-auth/client";

const navItems = [
  { href: "/smoke-testing", label: "Smoke Testing", icon: ActivityIcon },
  { href: "/e2e-testing", label: "e2e Testing", icon: ClipboardCheckIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
}

function UserAvatar({ user }: { user?: AppShellProps["user"] }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function formatUser(user: AppShellProps["user"]) {
    const displayName = user?.name || "Maintainer";
    const displayEmail = user?.email || "Account";
    const initials = user
      ? user.name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((name) => name[0])
          .join("")
          .toUpperCase() || "M"
      : "M";

    return { displayName, displayEmail, initials };
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const { error } = await authClient.signOut();

      if (!error) {
        router.push("/");
      }
    } finally {
      setIsLoggingOut(false);
    }
  }

  const { displayName, displayEmail, initials } = formatUser(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            tooltip="Account"
            className="group-data-[collapsible=icon]:justify-center"
          >
            <Avatar size="sm">
              {user?.image && (
                <AvatarImage src={user.image} alt={`${displayName} avatar`} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-sidebar-foreground/60">
                {displayEmail}
              </span>
            </span>
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOutIcon />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheckIcon className="size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">MMDC Testing</p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Maintainer Console
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Testing</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <UserAvatar user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium">MMDC Testing</span>
        </header>
        <main className="min-h-svh px-4 py-5 md:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

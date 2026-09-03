"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import {
  Plus,
  FolderOpen,
  Image,
  Settings,
  LogOut,
  ChevronLeft,
  User,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    authClient.getSession().then((s) => {
      if (s?.user) setSession(s);
    });
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const navItems = [
    {
      label: "New Project",
      icon: Plus,
      href: "/projects/new",
      accent: true,
    },
    {
      label: "Library",
      icon: FolderOpen,
      href: "/library",
    },
    {
      label: "Assets",
      icon: Image,
      href: "/assets",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-56"} flex flex-col border-r border-neutral-800 bg-neutral-950 transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <Link href="/library" className="text-lg font-semibold tracking-tight">
              NUMU
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-neutral-400"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </Button>
        </div>

        <Separator className="bg-neutral-800" />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    item.accent
                      ? "bg-accent-lime text-black font-medium hover:bg-accent-lime/90"
                      : isActive
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User menu */}
        <div className="p-2 border-t border-neutral-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-neutral-400 hover:text-white"
              >
                <div className="h-7 w-7 rounded-full bg-neutral-800 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <span className="truncate text-sm">
                    {session?.user?.name || session?.user?.email || "Account"}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-neutral-900 border-neutral-800">
              <DropdownMenuItem className="text-neutral-300">
                <User className="mr-2 h-4 w-4" />
                {session?.user?.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800" />
              <DropdownMenuItem onClick={handleSignOut} className="text-neutral-300">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  CalendarDays,
  ScrollText,
  Zap,
  Instagram,
  Facebook,
  Music2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { owner } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/audit", label: "Activity log", icon: ScrollText },
];

const socialNav = [
  { href: "/instagram", label: "Instagram", icon: Instagram, iconClass: "text-[#c13584]" },
  { href: "/facebook", label: "Facebook", icon: Facebook, iconClass: "text-[#1877f2]" },
  { href: "/tiktok", label: "TikTok", icon: Music2, iconClass: "text-[#fe2c55]" },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SocialNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="mt-4 px-3">
      <p className="px-3 pb-1.5 text-[11px] font-medium text-gray-400">
        Socials
      </p>
      <nav className="flex flex-col gap-0.5">
        {socialNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn("h-4 w-4", active ? item.iconClass : "text-gray-500")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pt-5 pb-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Zap className="h-4 w-4" fill="currentColor" />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-bold text-gray-900">eViral</p>
          <p className="text-[11px] text-gray-400">an Orbyte module</p>
        </div>
      </div>

      <NavItems />
      <SocialNavItems />

      <div className="px-3 pt-4">
        <Link
          href="/products/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-[13px] font-medium text-white shadow-xs transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New product
        </Link>
      </div>

      <div className="mt-auto px-3 pb-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar initials="KN" size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-gray-900">
                {owner.business}
              </p>
              <p className="truncate text-[11px] text-gray-500">
                {owner.businessTagline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 bg-white md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <p className="text-[13px] text-gray-500">
            <span className="font-medium text-gray-900">{owner.business}</span>
            <span className="hidden sm:inline"> · {owner.businessTagline}</span>
          </p>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-[13px] text-gray-600 sm:block">
              {owner.name}
            </span>
            <Avatar initials={owner.initials} size="md" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">
          {children}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map((item) => (
            <MobileNavItem key={item.href} {...item} />
          ))}
          <Link
            href="/products/new"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-[10px] font-medium text-brand-600"
          >
            <Plus className="h-5 w-5" />
            New
          </Link>
        </nav>
      </div>
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
}: (typeof nav)[number]) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-[10px] font-medium",
        active ? "text-brand-700" : "text-gray-500"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

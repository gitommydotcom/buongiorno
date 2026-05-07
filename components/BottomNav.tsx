"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Oggi", icon: Sun },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "tap relative flex flex-1 flex-col items-center justify-center gap-1 py-3.5 text-xs select-none active:bg-fg/5",
                "min-h-[64px]",
                active ? "text-accent" : "text-muted",
              )}
            >
              {active && (
                <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" aria-hidden />
              )}
              <Icon size={24} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

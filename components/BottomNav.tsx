"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Oggi", icon: Sun },
  { href: "/settimana", label: "Settimana", icon: Calendar },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "tap flex flex-1 flex-col items-center gap-1 py-3 text-xs",
                active ? "text-accent" : "text-muted",
              )}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

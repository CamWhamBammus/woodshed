"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Copy, FolderTree, FolderX, Hammer, Monitor, Radar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { THEME_PREFERENCE_LABELS, THEME_PREFERENCE_ORDER, THEME_SWATCH } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Dev Junk", icon: Trash2 },
  { href: "/organize", label: "Organize", icon: FolderTree },
  { href: "/duplicates", label: "Duplicates", icon: Copy },
  { href: "/screenshots", label: "Screenshot Sweep", icon: Camera },
  { href: "/stale-projects", label: "Stale Projects", icon: Radar },
  { href: "/empty-folders", label: "Empty Folders", icon: FolderX },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { preference, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#7a5738]/12 bg-[#10190f] text-[#f6efe1]">
        <div className="flex items-center gap-2 px-5 py-6">
          <Hammer size={20} className="text-[#8ea377]" strokeWidth={1.75} />
          <span className="font-serif text-[1.05rem] tracking-tight">Woodshed</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[#f6efe1]/10 text-[#fdfbf5]"
                    : "text-[#f6efe1]/60 hover:bg-[#f6efe1]/5 hover:text-[#f6efe1]"
                )}
              >
                <Icon size={16} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-5 py-5">
          <div className="mb-3 flex items-center gap-1.5">
            {THEME_PREFERENCE_ORDER.map((t) => {
              const active = preference === t;
              const ring = active ? "ring-[#f6efe1]/70" : "ring-[#f6efe1]/15 hover:ring-[#f6efe1]/40";
              if (t === "auto") {
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title="Auto — follow system"
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-offset-1 ring-offset-[#10190f] transition-all",
                      ring
                    )}
                  >
                    <Monitor size={11} className="text-[#f6efe1]/70" strokeWidth={2} />
                  </button>
                );
              }
              const [surface, accent] = THEME_SWATCH[t];
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={`${THEME_PREFERENCE_LABELS[t]} theme`}
                  className={cn("h-5 w-5 shrink-0 rounded-full ring-1 ring-offset-1 ring-offset-[#10190f] transition-all", ring)}
                  style={{ background: `linear-gradient(135deg, ${surface} 50%, ${accent} 50%)` }}
                />
              );
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-[#f6efe1]/35">
            Where the cabin keeps
            <br />
            its tools tidy.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-parchment">{children}</main>
    </div>
  );
}

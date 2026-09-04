import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { reloadFromSupabase, useStoreMeta } from "@/lib/store";

const MARKET_URL =
  import.meta.env.PUBLIC_MARKET_APP_URL ||
  import.meta.env.NEXT_PUBLIC_MARKET_APP_URL ||
  "http://localhost:3001";

const NAV = [
  { href: "/", label: "Dashboard", external: false },
  { href: MARKET_URL, label: "Market", external: true },
  { href: "/calendar", label: "Calendar", external: false },
  { href: "/bookings", label: "Bookings", external: false },
  { href: "/cars", label: "Cars", external: false },
  { href: "/service", label: "Service", external: false },
  { href: "/reports", label: "Reports", external: false },
  { href: "/settings", label: "Settings", external: false },
] as const;

function navClass(isActive: boolean) {
  return `rounded-md px-2.5 py-1.5 text-sm hover:bg-stone-100 ${
    isActive ? "bg-stone-100 text-stone-900" : "text-stone-600"
  }`;
}

export function Shell({ children }: { children: ReactNode }) {
  const { status, error } = useStoreMeta();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#d1fae5_0%,_#eef2f1_40%,_#f3f6f5_100%)]">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="font-semibold tracking-tight text-teal-900">
              Varebil Admin
            </NavLink>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={navClass(false)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    end={item.href === "/"}
                    className={({ isActive }) => navClass(isActive)}
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
            </nav>
          </div>
          <div className="text-xs text-stone-500">
            {status === "loading"
              ? "Loading…"
              : status === "error"
                ? "Supabase error"
                : "Supabase"}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {NAV.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                className={`whitespace-nowrap ${navClass(false)}`}
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `whitespace-nowrap ${navClass(isActive)}`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {status === "loading" ? (
          <div className="rounded-xl border border-stone-200 bg-white p-8 text-sm text-stone-600 shadow-sm">
            Loading fleet data from Supabase…
          </div>
        ) : status === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900 shadow-sm">
            <p className="font-medium">Could not load from Supabase</p>
            <p className="mt-2 whitespace-pre-wrap text-rose-800">{error}</p>
            <p className="mt-3 text-xs text-rose-700">
              Check that the <code>rental</code> schema is exposed in Supabase API
              settings and that RLS allows anon read/write on the tables.
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  void reloadFromSupabase().catch(() => undefined);
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

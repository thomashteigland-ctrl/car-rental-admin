"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJson, queryKeys } from "@/lib/query-keys";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/market", label: "Market" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Bookings" },
  { href: "/cars", label: "Cars" },
  { href: "/service", label: "Service" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
] as const;

function prefetchFor(href: string, queryClient: ReturnType<typeof useQueryClient>) {
  switch (href) {
    case "/":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard("ytd", null),
        queryFn: () => fetchJson("/api/dashboard"),
      });
      break;
    case "/cars":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.cars(null),
        queryFn: () => fetchJson("/api/cars"),
      });
      break;
    case "/bookings":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.bookings,
        queryFn: () => fetchJson("/api/bookings"),
      });
      break;
    case "/market":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.market,
        queryFn: () => fetchJson("/api/market"),
      });
      break;
    case "/calendar":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.calendar(null),
        queryFn: () => fetchJson("/api/calendar"),
      });
      break;
    case "/reports":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.reports("", ""),
        queryFn: () => fetchJson("/api/reports"),
      });
      break;
    case "/service":
      void queryClient.prefetchQuery({
        queryKey: queryKeys.service,
        queryFn: () => fetchJson("/api/service"),
      });
      break;
    default:
      break;
  }
}

export function Shell({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#d1fae5_0%,_#eef2f1_40%,_#f3f6f5_100%)]">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-semibold tracking-tight text-teal-900"
              onMouseEnter={() => prefetchFor("/", queryClient)}
              onFocus={() => prefetchFor("/", queryClient)}
            >
              Varebil Admin
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => prefetchFor(item.href, queryClient)}
                  onFocus={() => prefetchFor(item.href, queryClient)}
                  className="rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => prefetchFor(item.href, queryClient)}
              onFocus={() => prefetchFor(item.href, queryClient)}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

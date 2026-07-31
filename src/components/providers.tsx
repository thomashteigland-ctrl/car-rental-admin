"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Stop mouse-wheel from nudging focused/hovered `<input type="number">` values. */
function useDisableNumberInputScroll() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.type !== "number") return;
      e.preventDefault();
      // Drop focus so further wheel events scroll the page instead
      el.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useDisableNumberInputScroll();

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

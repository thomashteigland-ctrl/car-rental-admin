export const queryKeys = {
  dashboard: (range: string, month: string | null) =>
    ["dashboard", range, month ?? ""] as const,
  cars: (newerThan: number | null) => ["cars", newerThan ?? ""] as const,
  bookings: ["bookings"] as const,
  market: ["market"] as const,
  calendar: (week: string | null) => ["calendar", week ?? ""] as const,
  reports: (from: string, to: string) => ["reports", from, to] as const,
  service: ["service"] as const,
};

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

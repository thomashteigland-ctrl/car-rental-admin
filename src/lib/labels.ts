export const BOOKING_STATUSES = [
  "draft",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const CHANNELS = ["getaround", "private"] as const;

export const CAR_STATUSES = [
  "available",
  "on_rent",
  "maintenance",
  "retired",
] as const;

export const SERVICE_TYPES = [
  "service",
  "tires",
  "brakes",
  "damage",
  "wash",
  "other",
] as const;

export function labelStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
    available: "Available",
    on_rent: "On rent",
    maintenance: "Maintenance",
    retired: "Retired",
    getaround: "GetAround",
    private: "Private",
    service: "Service",
    tires: "Tires",
    brakes: "Brakes",
    damage: "Damage",
    wash: "Wash",
  };
  return map[status] ?? status;
}

export function statusTone(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-stone-100 text-stone-700",
    confirmed: "bg-sky-100 text-sky-800",
    active: "bg-emerald-100 text-emerald-800",
    completed: "bg-zinc-100 text-zinc-700",
    cancelled: "bg-rose-100 text-rose-800",
    no_show: "bg-amber-100 text-amber-900",
    available: "bg-emerald-100 text-emerald-800",
    on_rent: "bg-sky-100 text-sky-800",
    maintenance: "bg-amber-100 text-amber-900",
    retired: "bg-stone-200 text-stone-600",
  };
  return map[status] ?? "bg-stone-100 text-stone-700";
}

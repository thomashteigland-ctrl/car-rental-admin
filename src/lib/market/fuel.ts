export function fuelGroupFor(fuel: string): "ICE" | "BEV" {
  const f = (fuel || "").toLowerCase();
  if (f === "electric" || f === "el" || f === "elektrisk" || f === "bev") {
    return "BEV";
  }
  return "ICE";
}

export function wltpBucket(wltpKm: number | null): string {
  if (wltpKm == null) return "unknown";
  if (wltpKm < 280) return "lt_280";
  if (wltpKm < 320) return "280_319";
  return "320_plus";
}

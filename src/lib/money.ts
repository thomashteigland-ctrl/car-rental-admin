/** Amounts are stored as øre (integers). 1 kr = 100 øre. */

export function oreToKr(ore: number): number {
  return ore / 100;
}

export function krToOre(kr: number): number {
  return Math.round(kr * 100);
}

export function formatNOK(
  ore: number,
  opts?: { signed?: boolean; decimals?: number },
): string {
  const kr = oreToKr(ore);
  const decimals = opts?.decimals ?? 0;
  const formatted = new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(kr));
  if (opts?.signed && ore !== 0) {
    return ore < 0 ? `−${formatted}` : formatted;
  }
  if (ore < 0) return `−${formatted}`;
  return formatted;
}

export function withVat(exVatOre: number, vatPercent: number): number {
  return Math.round(exVatOre * (1 + vatPercent / 100));
}

export function vatAmount(exVatOre: number, vatPercent: number): number {
  return withVat(exVatOre, vatPercent) - exVatOre;
}

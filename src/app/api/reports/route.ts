import { NextResponse } from "next/server";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { bookingEconomics } from "@/lib/booking-calc";
import {
  effectiveDepRates,
  loadMarketFitCache,
} from "@/lib/market/depreciation";
import { defaultPeriod, periodSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fallback = defaultPeriod();
  const from = searchParams.get("from")
    ? startOfMonth(parseISO(searchParams.get("from")!))
    : fallback.from;
  const to = searchParams.get("to")
    ? endOfMonth(parseISO(searchParams.get("to")!))
    : fallback.to;

  const fitMap = await loadMarketFitCache();
  const summary = await periodSummary(from, to, fitMap);
  const { bookings, ...rest } = summary;

  return NextResponse.json({
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
    summary: rest,
    bookingRows: bookings.map((b) => {
      const linked = b.serviceEvents.reduce((s, e) => s + e.amountOre, 0);
      const rates = effectiveDepRates(
        {
          purchasePriceOre: b.car.purchasePriceOre,
          purchaseOdometer: b.car.purchaseOdometer,
          fuelType: b.car.fuelType,
          marketModelId: b.car.marketModelId,
          marketModel: b.car.marketModel,
          depPerKmOre: b.car.depPerKmOre,
          depPerDayOre: b.car.depPerDayOre,
        },
        fitMap,
      );
      const econ = bookingEconomics(b, rates, linked);
      return {
        id: b.id,
        customerName: b.customerName,
        status: b.status,
        plannedStartAt: b.plannedStartAt.toISOString(),
        plannedEndAt: b.plannedEndAt.toISOString(),
        pickupTime: b.pickupTime,
        deliveryTime: b.deliveryTime,
        registrationPlate: b.car.registrationPlate,
        revenueExVatOre: econ.revenueExVatOre,
        cashMarginOre: econ.cashMarginOre,
        expectedDepOre: econ.expectedDepOre,
        economicProfitOre: econ.economicProfitOre,
      };
    }),
  });
}

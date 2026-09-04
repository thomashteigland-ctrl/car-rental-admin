import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env", "utf8");
const env = Object.fromEntries(
  [...envText.matchAll(/^([^#=\s]+)="?([^"\r\n]*)"?/gm)].map((m) => [m[1], m[2]]),
);

const sb = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
  db: { schema: "rental" },
});

for (const t of [
  "Car",
  "Booking",
  "BookingLineItem",
  "ServiceEvent",
  "OdometerReading",
  "CarFixedCost",
  "LineItemCategory",
  "MarketModel",
  "MarketListing",
  "AppSetting",
]) {
  const { data, error, status } = await sb.from(t).select("id").limit(1);
  if (error) console.log(`${t}: FAIL ${status} ${error.message}`);
  else console.log(`${t}: OK ${data?.length ?? 0}`);
}

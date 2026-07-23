import { MarketChart } from "@/components/market-chart";
import { PageHeader } from "@/components/ui";
import { loadMarketChartData } from "@/lib/market/chart-data";
import { getScrapeStatus } from "@/lib/market/run-scrape";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [data, scrape] = await Promise.all([
    loadMarketChartData(),
    getScrapeStatus(),
  ]);

  return (
    <div>
      <PageHeader
        title="Market"
        subtitle="FINN.no price vs km — scrape and filter listings"
      />
      <MarketChart
        data={data}
        initialStatus={{ status: scrape.status, message: scrape.message }}
      />
    </div>
  );
}

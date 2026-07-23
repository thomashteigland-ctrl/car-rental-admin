import { AddMarketModelForm } from "@/components/add-market-model-form";
import { ManageMarketModels } from "@/components/manage-market-models";
import { MarketChart } from "@/components/market-chart";
import { PageHeader } from "@/components/ui";
import { loadMarketChartData } from "@/lib/market/chart-data";
import { getScrapeStatus } from "@/lib/market/run-scrape";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const [data, scrape, models] = await Promise.all([
    loadMarketChartData(),
    getScrapeStatus(),
    prisma.marketModel.findMany({
      orderBy: [{ hidden: "asc" }, { name: "asc" }],
      select: { id: true, name: true, variant: true, hidden: true },
    }),
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
      <div className="mt-4 space-y-4">
        <ManageMarketModels models={models} />
        <AddMarketModelForm />
      </div>
    </div>
  );
}

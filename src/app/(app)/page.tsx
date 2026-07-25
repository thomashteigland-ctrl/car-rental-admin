import { Suspense } from "react";
import { DashboardPageClient } from "@/components/dashboard-page";
import { PageHeader } from "@/components/ui";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Dashboard"
            subtitle="Earnings overview, weekly chart, then month detail"
          />
          <div className="mt-6 h-40 animate-pulse rounded-xl bg-stone-200/60" />
        </div>
      }
    >
      <DashboardPageClient />
    </Suspense>
  );
}

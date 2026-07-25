import { Suspense } from "react";
import { ReportsPageClient } from "@/components/reports-page";
import { PageHeader } from "@/components/ui";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Reports"
            subtitle="Period P&L with depreciation and service"
          />
          <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
        </div>
      }
    >
      <ReportsPageClient />
    </Suspense>
  );
}

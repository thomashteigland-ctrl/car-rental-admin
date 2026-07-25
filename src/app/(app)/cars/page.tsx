import { Suspense } from "react";
import { CarsPageClient } from "@/components/cars-page";
import { PageHeader } from "@/components/ui";

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Cars"
            subtitle="Fleet inventory, status and depreciation rates"
          />
          <div className="mt-4 h-48 animate-pulse rounded-xl bg-stone-200/60" />
        </div>
      }
    >
      <CarsPageClient />
    </Suspense>
  );
}

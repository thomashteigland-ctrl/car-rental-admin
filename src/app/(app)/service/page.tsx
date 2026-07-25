import { Suspense } from "react";
import { ServicePageClient } from "@/components/service-page";
import { PageHeader } from "@/components/ui";

export default function ServicePage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Service"
            subtitle="Log date + odometer — intervals are tracked in km"
          />
          <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
        </div>
      }
    >
      <ServicePageClient />
    </Suspense>
  );
}

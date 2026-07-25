import { Suspense } from "react";
import { CalendarPageClient } from "@/components/calendar-page";
import { PageHeader } from "@/components/ui";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader title="Calendar" subtitle="Loading…" />
          <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
        </div>
      }
    >
      <CalendarPageClient />
    </Suspense>
  );
}

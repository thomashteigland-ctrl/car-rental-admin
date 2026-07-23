import { QuickBookingForm } from "@/components/quick-booking-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string }>;
}) {
  const params = await searchParams;
  const cars = await prisma.car.findMany({
    where: { status: { not: "retired" } },
    orderBy: { registrationPlate: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="New booking"
        subtitle="Name, dates, and revenue — add the rest after"
      />
      <QuickBookingForm cars={cars} defaultCarId={params.carId} />
    </div>
  );
}

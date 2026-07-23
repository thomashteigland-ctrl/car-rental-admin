import { CarForm } from "@/components/car-form";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function NewCarPage() {
  const marketModels = await prisma.marketModel.findMany({
    where: { hidden: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, variant: true },
  });

  return (
    <div>
      <PageHeader title="Add car" subtitle="Register a new fleet vehicle" />
      <CarForm marketModels={marketModels} />
    </div>
  );
}

import { PageHeader } from "@/components/ui";
import { CarFormFields } from "./CarFormFields";

export function CarNewPage() {
  return (
    <div>
      <PageHeader title="Add car" subtitle="New fleet vehicle" />
      <CarFormFields />
    </div>
  );
}

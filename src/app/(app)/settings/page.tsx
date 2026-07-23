import { revalidatePath } from "next/cache";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

async function addCategoryAction(formData: FormData) {
  "use server";
  const kind = String(formData.get("kind") ?? "revenue");
  const name = String(formData.get("name") ?? "").trim();
  const accountCode = String(formData.get("accountCode") ?? "").trim() || null;
  if (!name) return;
  await prisma.lineItemCategory.upsert({
    where: { kind_name: { kind, name } },
    update: { accountCode, active: true },
    create: { kind, name, accountCode },
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const categories = await prisma.lineItemCategory.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Categories and defaults" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Line item categories</h2>
          <ul className="mb-4 divide-y divide-stone-100 text-sm">
            {categories.map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <span>
                  <span className="text-stone-400">{c.kind}</span> · {c.name}
                </span>
                <span className="text-stone-500">{c.accountCode ?? "—"}</span>
              </li>
            ))}
          </ul>
          <form action={addCategoryAction} className="grid gap-2 sm:grid-cols-3">
            <Field label="Kind">
              <select name="kind" className={inputClass}>
                <option value="revenue">Revenue</option>
                <option value="cost">Cost</option>
              </select>
            </Field>
            <Field label="Name">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Account code">
              <input name="accountCode" placeholder="3000" className={inputClass} />
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" variant="secondary">
                Add category
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Defaults</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Currency</dt>
              <dd>NOK (øre internally)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Default VAT</dt>
              <dd>25%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Access</dt>
              <dd>Open (no login)</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

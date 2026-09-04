import { type FormEvent, useState } from "react";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { downloadText } from "@/lib/csv";
import {
  addCategory,
  reloadFromSupabase,
  useAppData,
  useStoreMeta,
} from "@/lib/store";

export function SettingsPage() {
  const data = useAppData();
  const meta = useStoreMeta();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addCategory({
      kind: String(fd.get("kind") ?? "revenue"),
      name: String(fd.get("name") ?? "").trim(),
      accountCode: String(fd.get("accountCode") ?? "").trim() || null,
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Categories, Supabase sync, and defaults" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Line item categories</h2>
          <ul className="mb-4 divide-y divide-stone-100 text-sm">
            {data.categories.map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <span>
                  <span className="text-stone-400">{c.kind}</span> · {c.name}
                </span>
                <span className="text-stone-500">{c.accountCode ?? "—"}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => void onAdd(e)} className="grid gap-2 sm:grid-cols-3">
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
          <dl className="mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Currency</dt>
              <dd>NOK (øre internally)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Default VAT</dt>
              <dd>25%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Storage</dt>
              <dd>Supabase ({meta.status})</dd>
            </div>
          </dl>

          <h2 className="mb-3 text-sm font-semibold">Supabase</h2>
          <p className="mb-3 text-xs text-stone-500">
            Live data comes from your Supabase <code>rental</code> schema.
          </p>
          {message ? (
            <p className="mb-3 text-xs text-stone-600">{message}</p>
          ) : null}
          <div className="mb-6 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setMessage(null);
                void reloadFromSupabase()
                  .then(() => setMessage("Reloaded from Supabase."))
                  .catch((e) =>
                    setMessage(e instanceof Error ? e.message : "Reload failed"),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              Reload from Supabase
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadText(
                  "varebil-admin.json",
                  JSON.stringify(data, null, 2),
                  "application/json",
                )
              }
            >
              Export JSON backup
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  pct,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  /** e.g. share of revenue shown beside the main value */
  pct?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-rose-700"
        : tone === "warn"
          ? "text-amber-700"
          : "text-stone-900";
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-4">
        <div className={`text-2xl font-semibold tabular-nums ${valueColor}`}>
          {value}
        </div>
        {pct ? (
          <div className={`text-sm font-semibold tabular-nums ${valueColor} opacity-80`}>
            {pct}
          </div>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-stone-400">{hint}</div> : null}
    </Card>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-teal-800 text-white hover:bg-teal-900"
      : variant === "secondary"
        ? "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
        : variant === "danger"
          ? "bg-rose-700 text-white hover:bg-rose-800"
          : "text-stone-600 hover:bg-stone-100";
  const cls = `inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-teal-700/30 focus:ring-2";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="py-10 text-center">
      <div className="text-base font-medium text-stone-800">{title}</div>
      {body ? <p className="mt-1 text-sm text-stone-500">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

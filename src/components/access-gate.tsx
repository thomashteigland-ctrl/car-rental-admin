import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui";

const STORAGE_KEY = "varebil-admin-unlocked";

function expectedCode() {
  return (
    import.meta.env.PUBLIC_ADMIN_ACCESS_CODE ||
    import.meta.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE ||
    ""
  ).trim();
}

function isUnlocked() {
  const code = expectedCode();
  if (!code) {
    // Local/dev without a code configured stays open; production must set one.
    return !import.meta.env.PROD;
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY) === code;
  } catch {
    return false;
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const code = expectedCode();

  if (unlocked) return children;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code) {
      setError(true);
      return;
    }
    if (value.trim() === code) {
      try {
        sessionStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* ignore quota / private mode */
      }
      setUnlocked(true);
      setError(false);
      return;
    }
    setError(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#d1fae5_0%,_#eef2f1_40%,_#f3f6f5_100%)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold tracking-tight text-teal-900">
          Varebil Admin
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {code
            ? "Enter the access code to continue."
            : "Access code is not configured (set PUBLIC_ADMIN_ACCESS_CODE)."}
        </p>
        <label className="mt-5 block space-y-1.5">
          <span className="text-sm font-medium text-stone-700">Access code</span>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-teal-800/30 focus:ring-2"
          />
        </label>
        {error ? (
          <p className="mt-2 text-sm text-rose-700">
            {code ? "Wrong code." : "Configure PUBLIC_ADMIN_ACCESS_CODE first."}
          </p>
        ) : null}
        <Button type="submit" className="mt-4 w-full" disabled={!code}>
          Unlock
        </Button>
      </form>
    </div>
  );
}

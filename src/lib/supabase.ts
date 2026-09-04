import { createClient } from "@supabase/supabase-js";

const url =
  import.meta.env.PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const key =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Missing Supabase URL or anon key (PUBLIC_SUPABASE_* / VITE_* / NEXT_PUBLIC_*)",
  );
}

export const supabase = createClient(url ?? "", key ?? "", {
  db: { schema: "rental" },
  auth: { persistSession: false, autoRefreshToken: false },
});

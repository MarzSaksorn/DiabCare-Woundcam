import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function useAuthenticatedMediaUrl(storageUrl: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);

    async function load() {
      try {
        const supabase = await getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("No authenticated session");

        const response = await fetch(storageUrl, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok)
          throw new Error(`Media request failed (${response.status})`);

        objectUrl = URL.createObjectURL(await response.blob());
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setUrl(objectUrl);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storageUrl]);

  return { url, error };
}

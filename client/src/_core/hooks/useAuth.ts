import { trpc } from "@/lib/trpc";
import { isPublicDemoMode } from "@/lib/public-demo";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    try {
      if (!isPublicDemoMode) {
        const { getSupabaseClient } = await import("@/lib/supabase");
        const supabase = await getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    } finally {
      try {
        await logoutMutation.mutateAsync();
      } catch (error) {
        if (
          !(
            error instanceof TRPCClientError &&
            error.data?.code === "UNAUTHORIZED"
          )
        ) {
          console.error(
            "[Auth] Failed to clear the legacy session cookie:",
            error
          );
        }
      }
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  return useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
      refresh: () => meQuery.refetch(),
      logout,
    }),
    [
      logout,
      logoutMutation.error,
      logoutMutation.isPending,
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      meQuery.refetch,
    ]
  );
}

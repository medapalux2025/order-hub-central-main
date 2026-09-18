import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = (search as Record<string, unknown>).code;
    if (typeof code !== "string" || !code) {
      setError(t("auth.callbackMissingCode"));
      return;
    }

    let cancelled = false;
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
      });

    return () => {
      cancelled = true;
    };
  }, [search, navigate, t]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground">{t("auth.callbackError")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/auth", replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("auth.backToSignIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">{t("auth.callbackProcessing")}</p>
      </div>
    </div>
  );
}

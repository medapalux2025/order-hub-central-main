import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";

export function useNetworkStatus() {
  const { t } = useI18n();
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      setOnline(true);
      toast.success(t("common.online"));
    };
    const onOffline = () => {
      setOnline(false);
      toast.error(t("common.offline"));
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [t]);

  return online;
}

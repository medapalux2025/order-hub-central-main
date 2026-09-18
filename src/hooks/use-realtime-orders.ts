import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { queryKeys, useNewOrders, type Order } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { playNewOrderChime } from "@/lib/orderhub";
import { showOrderNotification, updateAppBadge } from "@/lib/notifications";

const SOUND_KEY = "orderhub.sound";

export function isSoundEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
}

/** Subscribes to order changes and refreshes every order-derived query. */
export function useRealtimeOrders() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data: newOrders } = useNewOrders();

  // Keep the installed PWA app badge in sync with the number of unconfirmed orders.
  useEffect(() => {
    updateAppBadge(newOrders?.length ?? 0);
  }, [newOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("orderhub-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        void qc.invalidateQueries({ queryKey: queryKeys.orders });
        void qc.invalidateQueries({ queryKey: queryKeys.customers });
        if (payload.eventType === "INSERT") {
          const order = payload.new as Order;
          toast.success(t("dash.newOrderToast"), {
            description: `#${order.order_number ?? ""} · ${order.customer_name ?? ""}`,
          });
          if (isSoundEnabled()) playNewOrderChime();
          void showOrderNotification(t("dash.newOrderToast"), order);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "landing_pages" }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.landingPages });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void qc.invalidateQueries({ queryKey: queryKeys.products });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("[Realtime] channel status:", status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, t]);
}

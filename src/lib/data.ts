import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "./orderhub";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LandingPage = {
  id: string;
  name: string;
  slug: string;
  product_id: string | null;
  url: string | null;
  is_active: boolean;
  visits: number;
  api_key_hash: string | null;
  api_key_prefix: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  city: string | null;
  address: string | null;
  status: "active" | "vip" | "blocked";
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: number;
  customer_id: string | null;
  product_id: string | null;
  landing_page_id: string | null;
  customer_name: string;
  phone: string;
  city: string | null;
  address: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  source: string;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  product: { id: string; name: string; slug: string } | null;
  landing_page: { id: string; name: string; slug: string } | null;
};

export type StatusHistoryEntry = {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  created_at: string;
};

const ORDER_SELECT = "*, product:products(id,name,slug), landing_page:landing_pages(id,name,slug)";

export const queryKeys = {
  orders: ["orders"] as const,
  products: ["products"] as const,
  landingPages: ["landing_pages"] as const,
  customers: ["customers"] as const,
  orderHistory: (id: string) => ["order_history", id] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

/** Orders that have not been confirmed yet (status = "new"). */
export function useNewOrders() {
  const orders = useOrders();
  const data = useMemo(() => (orders.data ?? []).filter((o) => o.status === "new"), [orders.data]);
  return { ...orders, data };
}

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });
}

export function useLandingPages() {
  return useQuery({
    queryKey: queryKeys.landingPages,
    queryFn: async (): Promise<LandingPage[]> => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandingPage[];
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("last_order_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Customer[];
    },
  });
}

export function useOrderHistory(orderId: string | null) {
  return useQuery({
    queryKey: queryKeys.orderHistory(orderId ?? "none"),
    enabled: !!orderId,
    queryFn: async (): Promise<StatusHistoryEntry[]> => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StatusHistoryEntry[];
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("orders")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
      void qc.invalidateQueries({ queryKey: queryKeys.customers });
      void qc.invalidateQueries({ queryKey: queryKeys.orderHistory(vars.id) });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
      void qc.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | undefined;
      values: Record<string, unknown>;
    }) => {
      if (id) {
        const { error } = await supabase
          .from("products")
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(values as never);
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products });
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}

export function useSaveLandingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | undefined;
      values: Record<string, unknown>;
    }): Promise<{ apiKey: string | null }> => {
      if (id) {
        const { error } = await supabase
          .from("landing_pages")
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
        return { apiKey: null };
      }

      const { data: created, error: insertError } = await supabase
        .from("landing_pages")
        .insert(values as never)
        .select("id")
        .single();

      if (insertError) throw insertError;

      const landingPageId = (created as { id: string } | null)?.id;
      if (!landingPageId) throw new Error("landing_page_create_failed");

      const { data: apiKey, error: keyError } = await supabase.rpc(
        "generate_landing_page_api_key",
        {
          _landing_page_id: landingPageId,
        },
      );

      if (keyError) throw keyError;

      return { apiKey: (apiKey as string | null) ?? null };
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.landingPages }),
  });
}

export function useDeleteLandingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.landingPages });
      void qc.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("customers")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.customers }),
  });
}

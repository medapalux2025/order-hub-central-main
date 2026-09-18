import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { PageHeader, StatusBadge, EmptyState, TableSkeleton } from "@/components/orderhub/ui";
import { useI18n } from "@/lib/i18n";
import { useCustomers, useOrders, useUpdateCustomer, type Customer } from "@/lib/data";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/orderhub";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

const STATUSES = ["active", "vip", "blocked"] as const;

function CustomersPage() {
  const { t, lang } = useI18n();
  const { data: customers, isLoading } = useCustomers();
  const { data: orders } = useOrders();
  const updateCustomer = useUpdateCustomer();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | (typeof STATUSES)[number]>("all");
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customers ?? []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, status]);

  const duplicates = useMemo(() => {
    const map = new Map<string, Customer[]>();
    for (const c of customers ?? []) {
      const key = c.phone.replace(/\D/g, "").slice(-9);
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.values()].filter((g) => g.length > 1);
  }, [customers]);

  const customerOrders = useMemo(
    () => (orders ?? []).filter((o) => selected && o.customer_id === selected.id),
    [orders, selected],
  );

  async function changeStatus(c: Customer, next: string) {
    try {
      await updateCustomer.mutateAsync({ id: c.id, patch: { status: next } });
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  return (
    <>
      <PageHeader title={t("customers.title")} subtitle={t("customers.subtitle")} />

      <div className="surface-card grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("customers.searchPlaceholder")}
            className="ps-9"
            aria-label={t("common.search")}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger aria-label={t("common.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`customers.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {duplicates.length > 0 ? (
        <section className="surface-card p-4">
          <h2 className="font-display text-base font-bold">{t("customers.duplicates")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("customers.duplicatesHint")}</p>
          <ul className="mt-3 space-y-2">
            {duplicates.slice(0, 5).map((group) => (
              <li key={group[0]!.id} className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="num font-semibold">{group[0]!.phone}</span>
                <span className="ms-2 text-muted-foreground">
                  {group.map((c) => c.full_name).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("customers.searchPlaceholder")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customers.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("orders.city")}</TableHead>
                  <TableHead>{t("customers.orders")}</TableHead>
                  <TableHead>{t("customers.spent")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("customers.lastOrder")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="block font-medium">{c.full_name}</span>
                      <span className="num block text-xs text-muted-foreground">{c.phone}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.city || "—"}</TableCell>
                    <TableCell className="num">{formatNumber(c.total_orders, lang)}</TableCell>
                    <TableCell className="num whitespace-nowrap">
                      {formatCurrency(Number(c.total_spent), lang)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(c.last_order_at, lang)}
                    </TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => void changeStatus(c, v)}>
                        <SelectTrigger className="h-8 w-[120px]" aria-label={t("common.status")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`customers.status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="outline" size="sm" onClick={() => setSelected(c)}>
                        {t("customers.history")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.phone} · ${selected.city ?? "—"}` : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {customerOrders.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="num block font-semibold">#{o.order_number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(o.created_at, lang)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="num">{formatCurrency(Number(o.total_price), lang)}</span>
                  <StatusBadge status={o.status} />
                </span>
              </li>
            ))}
            {customerOrders.length === 0 ? (
              <li className="text-sm text-muted-foreground">{t("common.empty")}</li>
            ) : null}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingCart, Wallet, TrendingUp, PackageCheck } from "lucide-react";

import {
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from "@/components/orderhub/ui";
import { useI18n } from "@/lib/i18n";
import { useOrders } from "@/lib/data";
import {
  ORDER_STATUSES,
  SOURCE_LABELS,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/orderhub";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function topGroups(rows: { key: string; total: number }[], limit = 6) {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const prev = map.get(r.key) ?? { count: 0, total: 0 };
    map.set(r.key, { count: prev.count + 1, total: prev.total + r.total });
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function BreakdownCard({
  title,
  rows,
  max,
}: {
  title: string;
  rows: { key: string; count: number; total: number }[];
  max: number;
}) {
  const { lang, t } = useI18n();
  return (
    <section className="surface-card p-4 sm:p-5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          rows.map((r) => (
            <div key={r.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-foreground">{r.key}</span>
                <span className="num shrink-0 text-xs text-muted-foreground">
                  {formatNumber(r.count, lang)} · {formatCurrency(r.total, lang)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${max > 0 ? Math.max(4, (r.count / max) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DashboardPage() {
  const { t, lang } = useI18n();
  const { data: orders, isLoading } = useOrders();

  const stats = useMemo(() => {
    const list = orders ?? [];
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    let revenue = 0;
    for (const o of list) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
      if (o.status !== "cancelled" && o.status !== "returned") revenue += Number(o.total_price);
    }
    const total = list.length;
    const paid = total - (counts["cancelled"] ?? 0) - (counts["returned"] ?? 0);
    return {
      total,
      counts,
      revenue,
      avgBasket: paid > 0 ? revenue / paid : 0,
      confirmRate:
        total > 0 ? ((total - (counts["new"] ?? 0) - (counts["cancelled"] ?? 0)) / total) * 100 : 0,
      deliveryRate: total > 0 ? ((counts["delivered"] ?? 0) / total) * 100 : 0,
    };
  }, [orders]);

  const list = orders ?? [];
  const byProduct = topGroups(
    list.map((o) => ({ key: o.product?.name ?? t("common.none"), total: Number(o.total_price) })),
  );
  const byCity = topGroups(
    list.map((o) => ({ key: o.city || t("common.none"), total: Number(o.total_price) })),
  );
  const byLanding = topGroups(
    list.map((o) => ({
      key: o.landing_page?.name ?? t("common.none"),
      total: Number(o.total_price),
    })),
  );
  const bySource = topGroups(
    list.map((o) => ({
      key: SOURCE_LABELS[o.source] ?? o.source,
      total: Number(o.total_price),
    })),
  );
  const maxOf = (rows: { count: number }[]) => Math.max(1, ...rows.map((r) => r.count));

  return (
    <>
      <PageHeader
        title={t("dash.title")}
        subtitle={t("dash.subtitle")}
        actions={
          <Link
            to="/orders"
            className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-accent"
          >
            {t("dash.viewAll")}
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dash.totalOrders")}
          value={formatNumber(stats.total, lang)}
          hint={
            <Link to="/new-orders" className="hover:text-primary hover:underline">
              {formatNumber(stats.counts["new"] ?? 0, lang)} {t("dash.newOrders").toLowerCase()}
            </Link>
          }
          icon={<ShoppingCart className="size-4" />}
          tone="primary"
        />
        <StatCard
          label={t("dash.revenue")}
          value={formatCurrency(stats.revenue, lang)}
          hint={`${t("dash.avgBasket")}: ${formatCurrency(stats.avgBasket, lang)}`}
          icon={<Wallet className="size-4" />}
          tone="success"
        />
        <StatCard
          label={t("dash.confirmRate")}
          value={formatPercent(stats.confirmRate, lang)}
          hint={`${t("dash.confirmed")}: ${formatNumber(stats.counts["confirmed"] ?? 0, lang)}`}
          icon={<TrendingUp className="size-4" />}
          tone="accent"
        />
        <StatCard
          label={t("dash.deliveryRate")}
          value={formatPercent(stats.deliveryRate, lang)}
          hint={`${t("dash.delivered")}: ${formatNumber(stats.counts["delivered"] ?? 0, lang)}`}
          icon={<PackageCheck className="size-4" />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(["new", "confirmed", "preparing", "shipped", "delivered", "cancelled"] as const).map(
          (s) => (
            <div key={s} className="surface-card flex items-center justify-between gap-3 p-4">
              <StatusBadge status={s} />
              <span className="num text-lg font-bold">
                {formatNumber(stats.counts[s] ?? 0, lang)}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title={t("dash.byProduct")} rows={byProduct} max={maxOf(byProduct)} />
        <BreakdownCard title={t("dash.bySource")} rows={bySource} max={maxOf(bySource)} />
        <BreakdownCard title={t("dash.byLanding")} rows={byLanding} max={maxOf(byLanding)} />
        <BreakdownCard title={t("dash.byCity")} rows={byCity} max={maxOf(byCity)} />
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-bold">{t("dash.recentOrders")}</h2>
          <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
            {t("dash.viewAll")}
          </Link>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : list.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("orders.subtitle")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.id")}</TableHead>
                  <TableHead>{t("orders.customer")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("orders.product")}</TableHead>
                  <TableHead>{t("orders.totalPrice")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("orders.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.slice(0, 8).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="num font-semibold">#{o.order_number}</TableCell>
                    <TableCell>
                      <span className="block font-medium">{o.customer_name}</span>
                      <span className="num block text-xs text-muted-foreground">{o.phone}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{o.product?.name ?? "—"}</TableCell>
                    <TableCell className="num">
                      {formatCurrency(Number(o.total_price), lang)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                      {formatDateTime(o.created_at, lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}

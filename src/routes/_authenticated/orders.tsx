import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Printer, Search, Trash2 } from "lucide-react";

import {
  CustomerCell,
  PageHeader,
  StatusBadge,
  EmptyState,
  TableSkeleton,
} from "@/components/orderhub/ui";
import { OrderPrintButton } from "@/components/orderhub/order-print-button";
import { useI18n } from "@/lib/i18n";
import { useDeleteOrder, useOrderHistory, useOrders, useUpdateOrder, type Order } from "@/lib/data";
import {
  ORDER_STATUSES,
  SOURCES,
  SOURCE_LABELS,
  downloadCsv,
  formatCurrency,
  formatDateTime,
  formatNumber,
  type OrderStatus,
} from "@/lib/orderhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const PAGE_SIZE = 20;

function OrdersPage() {
  const { t, lang } = useI18n();
  const { data: orders, isLoading } = useOrders();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [source, setSource] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "totalDesc" | "totalAsc">("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [internalNotes, setInternalNotes] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = (orders ?? []).filter((o) => {
      if (o.status === "new") return false;
      if (status !== "all" && o.status !== status) return false;
      if (source !== "all" && o.source !== source) return false;
      const day = o.created_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (!q) return true;
      return (
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        String(o.order_number).includes(q) ||
        (o.city ?? "").toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "newest") return a.created_at < b.created_at ? 1 : -1;
      if (sort === "oldest") return a.created_at > b.created_at ? 1 : -1;
      if (sort === "totalDesc") return Number(b.total_price) - Number(a.total_price);
      return Number(a.total_price) - Number(b.total_price);
    });
    return rows;
  }, [orders, search, status, source, sort, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const { data: history } = useOrderHistory(selected?.id ?? null);

  async function changeStatus(order: Order, next: OrderStatus) {
    try {
      await updateOrder.mutateAsync({ id: order.id, patch: { status: next } });
      toast.success(t("orders.statusUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  async function saveNotes() {
    if (!selected) return;
    try {
      await updateOrder.mutateAsync({ id: selected.id, patch: { internal_notes: internalNotes } });
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  function exportCsv() {
    downloadCsv(
      `commandes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((o) => ({
        numero: o.order_number,
        client: o.customer_name,
        telephone: o.phone,
        ville: o.city ?? "",
        adresse: o.address ?? "",
        produit: o.product?.name ?? "",
        quantite: o.quantity,
        total: o.total_price,
        statut: o.status,
        source: o.source,
        campagne: o.campaign ?? "",
        page: o.landing_page?.name ?? "",
        date: o.created_at,
      })),
    );
  }

  return (
    <>
      <PageHeader
        title={t("orders.title")}
        subtitle={t("orders.subtitle")}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" />
            {t("common.export")}
          </Button>
        }
      />

      <div className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("orders.searchPlaceholder")}
            className="ps-9"
            aria-label={t("common.search")}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label={t("common.status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {ORDER_STATUSES.filter((s) => s !== "new").map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={source}
          onValueChange={(v) => {
            setSource(v);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label={t("orders.source")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger aria-label={t("orders.sort")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("orders.sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t("orders.sortOldest")}</SelectItem>
            <SelectItem value="totalDesc">{t("orders.sortTotalDesc")}</SelectItem>
            <SelectItem value="totalAsc">{t("orders.sortTotalAsc")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 xl:col-span-2">
          <div className="grid gap-1">
            <Label htmlFor="o-from" className="text-xs text-muted-foreground">
              {t("orders.dateFrom")}
            </Label>
            <Input
              id="o-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="o-to" className="text-xs text-muted-foreground">
              {t("orders.dateTo")}
            </Label>
            <Input
              id="o-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">
              {formatNumber(filtered.length, lang)}
            </span>{" "}
            {t("orders.count")}
          </p>
        </div>
        {isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("orders.searchPlaceholder")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.id")}</TableHead>
                  <TableHead>{t("orders.customer")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("orders.city")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("orders.product")}</TableHead>
                  <TableHead>{t("orders.totalPrice")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("orders.source")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell
                      className="num font-semibold"
                      onClick={() => {
                        setSelected(o);
                        setInternalNotes(o.internal_notes ?? "");
                      }}
                    >
                      #{o.order_number}
                    </TableCell>
                    <TableCell
                      onClick={() => {
                        setSelected(o);
                        setInternalNotes(o.internal_notes ?? "");
                      }}
                    >
                      <CustomerCell name={o.customer_name} phone={o.phone} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{o.city || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {o.product?.name ?? "—"}
                      <span className="num block text-xs text-muted-foreground">×{o.quantity}</span>
                    </TableCell>
                    <TableCell className="num whitespace-nowrap">
                      {formatCurrency(Number(o.total_price), lang)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => void changeStatus(o, v as OrderStatus)}
                      >
                        <SelectTrigger
                          className="h-8 w-[150px]"
                          aria-label={t("orders.changeStatus")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.filter((s) => s !== "new").map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {SOURCE_LABELS[o.source] ?? o.source}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {o.status !== "new" ? (
                          <OrderPrintButton
                            order={o}
                            variant="ghost"
                            size="icon"
                            aria-label={t("orders.print")}
                          >
                            <Printer className="size-4" />
                          </OrderPrintButton>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("orders.deleteTitle")}
                          onClick={() => setPendingDelete(o)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {t("common.page")} {current} {t("common.of")} {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={current <= 1}
                onClick={() => setPage(current - 1)}
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pageCount}
                onClick={() => setPage(current + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("orders.details")} {selected ? `#${selected.order_number}` : ""}
            </DialogTitle>
            <DialogDescription>
              {selected ? formatDateTime(selected.created_at, lang) : ""}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("orders.customer")} value={selected.customer_name} />
                <Field label={t("orders.phone")} value={selected.phone} />
                <Field label={t("orders.city")} value={selected.city || "—"} />
                <Field label={t("orders.address")} value={selected.address || "—"} />
                <Field label={t("orders.product")} value={selected.product?.name ?? "—"} />
                <Field label={t("orders.qty")} value={String(selected.quantity)} />
                <Field
                  label={t("orders.unitPrice")}
                  value={formatCurrency(Number(selected.unit_price), lang)}
                />
                <Field
                  label={t("orders.totalPrice")}
                  value={formatCurrency(Number(selected.total_price), lang)}
                />
                <Field
                  label={t("orders.source")}
                  value={SOURCE_LABELS[selected.source] ?? selected.source}
                />
                <Field label={t("orders.campaign")} value={selected.campaign || "—"} />
                <Field label={t("orders.landing")} value={selected.landing_page?.name ?? "—"} />
                <Field label={t("common.status")} value={t(`status.${selected.status}`)} />
              </div>

              {selected.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("orders.notes")}
                  </p>
                  <p className="mt-1">{selected.notes}</p>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="internalNotes">{t("orders.internalNotes")}</Label>
                <Textarea
                  id="internalNotes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("orders.history")}
                </p>
                <ul className="mt-2 space-y-2">
                  {(history ?? []).map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2">
                        {h.from_status ? <StatusBadge status={h.from_status} /> : null}
                        <span>→</span>
                        <StatusBadge status={h.to_status} />
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateTime(h.created_at, lang)}
                      </span>
                    </li>
                  ))}
                  {(history ?? []).length === 0 ? (
                    <li className="text-xs text-muted-foreground">{t("common.empty")}</li>
                  ) : null}
                </ul>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {selected && selected.status !== "new" ? (
              <OrderPrintButton order={selected} variant="outline">
                <Printer className="me-1.5 size-4" />
                {t("orders.print")}
              </OrderPrintButton>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("common.close")}
            </Button>
            <Button onClick={saveNotes} disabled={updateOrder.isPending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("orders.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deleteOrder.mutateAsync(pendingDelete.id);
                  toast.success(t("common.deleted"));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : t("common.error"));
                } finally {
                  setPendingDelete(null);
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words">{value}</p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Clock, Search, Trash2 } from "lucide-react";

import { CustomerCell, PageHeader, EmptyState, TableSkeleton } from "@/components/orderhub/ui";
import { useI18n } from "@/lib/i18n";
import { useDeleteOrder, useNewOrders, useUpdateOrder, type Order } from "@/lib/data";
import { SOURCE_LABELS, formatCurrency, formatDateTime, formatNumber } from "@/lib/orderhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/new-orders")({
  component: NewOrdersPage,
});

function NewOrdersPage() {
  const { t, lang } = useI18n();
  const { data: orders, isLoading } = useNewOrders();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders ?? [];
    return (orders ?? []).filter(
      (o) =>
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        String(o.order_number).includes(q) ||
        (o.city ?? "").toLowerCase().includes(q),
    );
  }, [orders, search]);

  async function confirmOrder(order: Order) {
    setConfirmingId(order.id);
    try {
      await updateOrder.mutateAsync({ id: order.id, patch: { status: "confirmed" } });
      toast.success(t("orders.statusUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title={t("newOrders.title")}
        subtitle={t("newOrders.subtitle")}
        actions={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>
              <span className="num font-semibold text-foreground">
                {formatNumber(filtered.length, lang)}
              </span>{" "}
              {t("newOrders.count")}
            </span>
          </div>
        }
      />

      <section className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="ps-9"
              aria-label={t("common.search")}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("newOrders.emptyHint")}</p>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("newOrders.emptyHint")} />
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
                  <TableHead className="hidden lg:table-cell">{t("orders.source")}</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("newOrders.receivedAt")}
                  </TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id} className="group cursor-pointer">
                    <TableCell className="num font-semibold" onClick={() => setSelected(o)}>
                      #{o.order_number}
                    </TableCell>
                    <TableCell onClick={() => setSelected(o)}>
                      <CustomerCell name={o.customer_name} phone={o.phone} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell" onClick={() => setSelected(o)}>
                      {o.city || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" onClick={() => setSelected(o)}>
                      {o.product?.name ?? "—"}
                      <span className="num block text-xs text-muted-foreground">×{o.quantity}</span>
                    </TableCell>
                    <TableCell className="num whitespace-nowrap">
                      {formatCurrency(Number(o.total_price), lang)}
                    </TableCell>
                    <TableCell
                      className="hidden lg:table-cell text-sm text-muted-foreground"
                      onClick={() => setSelected(o)}
                    >
                      {SOURCE_LABELS[o.source] ?? o.source}
                    </TableCell>
                    <TableCell
                      className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell"
                      onClick={() => setSelected(o)}
                    >
                      {formatDateTime(o.created_at, lang)}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5"
                          disabled={confirmingId === o.id || updateOrder.isPending}
                          onClick={() => void confirmOrder(o)}
                        >
                          <Check className="size-3.5" />
                          {confirmingId === o.id
                            ? t("newOrders.confirming")
                            : t("newOrders.confirm")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("orders.deleteTitle")}
                          className="size-8 text-destructive/80 hover:text-destructive"
                          onClick={() => setPendingDelete(o)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
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
                  label={t("orders.totalPrice")}
                  value={formatCurrency(Number(selected.total_price), lang)}
                />
                <Field
                  label={t("orders.source")}
                  value={SOURCE_LABELS[selected.source] ?? selected.source}
                />
              </div>
              {selected.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("orders.notes")}
                  </p>
                  <p className="mt-1">{selected.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {t("common.close")}
            </Button>
            {selected ? (
              <Button
                onClick={() => {
                  setSelected(null);
                  void confirmOrder(selected);
                }}
                disabled={confirmingId === selected.id || updateOrder.isPending}
              >
                <Check className="me-1.5 size-4" />
                {t("newOrders.confirm")}
              </Button>
            ) : null}
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

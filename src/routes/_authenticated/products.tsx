import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader, EmptyState, TableSkeleton } from "@/components/orderhub/ui";
import { useI18n } from "@/lib/i18n";
import { useDeleteProduct, useOrders, useProducts, useSaveProduct, type Product } from "@/lib/data";
import { formatCurrency, formatNumber, slugify } from "@/lib/orderhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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

export const Route = createFileRoute("/_authenticated/products")({
  component: ProductsPage,
});

type FormState = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  sku: "",
  price: "",
  compare_at_price: "",
  stock_quantity: "0",
  is_active: true,
};

function ProductsPage() {
  const { t, lang } = useI18n();
  const { data: products, isLoading } = useProducts();
  const { data: orders } = useOrders();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const perf = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of orders ?? []) {
      if (!o.product_id) continue;
      const prev = map.get(o.product_id) ?? { count: 0, revenue: 0 };
      const isLost = o.status === "cancelled" || o.status === "returned";
      map.set(o.product_id, {
        count: prev.count + 1,
        revenue: prev.revenue + (isLost ? 0 : Number(o.total_price)),
      });
    }
    return map;
  }, [orders]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      sku: p.sku ?? "",
      price: String(p.price),
      compare_at_price: p.compare_at_price === null ? "" : String(p.compare_at_price),
      stock_quantity: String(p.stock_quantity),
      is_active: p.is_active,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveProduct.mutateAsync({
        id: editing?.id,
        values: {
          name: form.name.trim(),
          slug: form.slug.trim() || slugify(form.name) || slugify(form.name),
          description: form.description.trim() || null,
          image_url: form.image_url.trim() || null,
          sku: form.sku.trim() || null,
          price: Number(form.price) || 0,
          compare_at_price: form.compare_at_price === "" ? null : Number(form.compare_at_price),
          stock_quantity: Number(form.stock_quantity) || 0,
          is_active: form.is_active,
        },
      });
      toast.success(t("common.saved"));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  const rows = products ?? [];

  return (
    <>
      <PageHeader
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t("products.new")}
          </Button>
        }
      />

      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("products.subtitle")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("products.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("products.sku")}</TableHead>
                  <TableHead>{t("products.price")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("products.stock")}</TableHead>
                  <TableHead>{t("products.orders")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("products.revenue")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const stats = perf.get(p.id) ?? { count: 0, revenue: 0 };
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              loading="lazy"
                              className="size-9 shrink-0 rounded-md object-cover"
                            />
                          ) : null}
                          <span>
                            <span className="block font-medium">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">{p.slug}</span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell num text-sm">
                        {p.sku || "—"}
                      </TableCell>
                      <TableCell className="num whitespace-nowrap">
                        {formatCurrency(Number(p.price), lang)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell num">
                        {formatNumber(p.stock_quantity, lang)}
                      </TableCell>
                      <TableCell className="num">{formatNumber(stats.count, lang)}</TableCell>
                      <TableCell className="hidden lg:table-cell num whitespace-nowrap">
                        {formatCurrency(stats.revenue, lang)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            p.is_active
                              ? "rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success"
                              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                          }
                        >
                          {p.is_active ? t("common.active") : t("common.inactive")}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("common.edit")}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("products.deleteTitle")}
                          onClick={() => setPendingDelete(p)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t("products.edit") : t("products.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">{t("products.name")}</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-slug">{t("products.slug")}</Label>
                <Input
                  id="p-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={slugify(form.name)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">{t("products.sku")}</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">{t("products.price")}</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-compare">{t("products.compareAt")}</Label>
                <Input
                  id="p-compare"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compare_at_price}
                  onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">{t("products.stock")}</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-image">{t("products.image")}</Label>
                <Input
                  id="p-image"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">{t("products.description")}</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="p-active">{t("common.active")}</Label>
              <Switch
                id="p-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saveProduct.isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deleteProduct.mutateAsync(pendingDelete.id);
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

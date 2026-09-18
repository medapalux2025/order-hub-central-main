import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, FileCode2, Key, Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader, EmptyState, TableSkeleton } from "@/components/orderhub/ui";
import { useI18n } from "@/lib/i18n";
import {
  useDeleteLandingPage,
  useLandingPages,
  useOrders,
  useProducts,
  useSaveLandingPage,
  type LandingPage,
} from "@/lib/data";
import { formatCurrency, formatNumber, formatPercent, slugify } from "@/lib/orderhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/landing-pages")({
  component: LandingPagesPage,
});

const NONE = "none";

const API_KEY_PLACEHOLDER = "oh_live_VOTRE_CLE_API";

type FormState = {
  name: string;
  slug: string;
  url: string;
  product_id: string;
  visits: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  url: "",
  product_id: NONE,
  visits: "0",
  is_active: true,
};

function LandingPagesPage() {
  const { t, lang } = useI18n();
  const { data: pages, isLoading } = useLandingPages();
  const { data: products } = useProducts();
  const { data: orders } = useOrders();
  const savePage = useSaveLandingPage();
  const deletePage = useDeleteLandingPage();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<LandingPage | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  const perf = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of orders ?? []) {
      if (!o.landing_page_id) continue;
      const prev = map.get(o.landing_page_id) ?? { count: 0, revenue: 0 };
      const isLost = o.status === "cancelled" || o.status === "returned";
      map.set(o.landing_page_id, {
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

  function openEdit(p: LandingPage) {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      url: p.url ?? "",
      product_id: p.product_id ?? NONE,
      visits: String(p.visits),
      is_active: p.is_active,
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { apiKey } = await savePage.mutateAsync({
        id: editing?.id,
        values: {
          name: form.name.trim(),
          slug: form.slug.trim() || slugify(form.name),
          url: form.url.trim() || null,
          product_id: form.product_id === NONE ? null : form.product_id,
          visits: Number(form.visits) || 0,
          is_active: form.is_active,
        },
      });
      toast.success(t("common.saved"));
      setOpen(false);
      if (apiKey) {
        setGeneratedApiKey(apiKey);
        setApiKeyDialogOpen(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    }
  }

  function buildIntegrationSnippet(slug: string, apiKey: string) {
    const origin = window.location.origin;
    return `// 1) Track the visit (on page load)
fetch("${origin}/api/public/visits", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ landing_page_slug: "${slug}" })
});

// 2) Send the order (on form submit)
fetch("${origin}/api/public/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "${apiKey}"
  },
  body: JSON.stringify({
    customer_name: "",
    phone: "",
    city: "",
    address: "",
    quantity: 1,
    source: "facebook"
  })
});`;
  }

  async function copyApiKey() {
    if (!generatedApiKey) return;
    try {
      await navigator.clipboard.writeText(generatedApiKey);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  async function copyInstructions(slug: string, apiKey?: string) {
    const snippet = buildIntegrationSnippet(slug, apiKey ?? API_KEY_PLACEHOLDER);
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  const rows = pages ?? [];

  return (
    <>
      <PageHeader
        title={t("landing.title")}
        subtitle={t("landing.subtitle")}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            {t("landing.new")}
          </Button>
        }
      />

      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.empty")} hint={t("landing.subtitle")} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("landing.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("landing.product")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("landing.apiKey")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("landing.visits")}</TableHead>
                  <TableHead>{t("landing.orders")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("landing.conversion")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("landing.revenue")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const stats = perf.get(p.id) ?? { count: 0, revenue: 0 };
                  const product = (products ?? []).find((x) => x.id === p.product_id);
                  const conversion = p.visits > 0 ? (stats.count / p.visits) * 100 : 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <span className="block font-medium">{p.name}</span>
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                          >
                            {p.url}
                          </a>
                        ) : (
                          <span className="block text-xs text-muted-foreground">{p.slug}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{product?.name ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <Key className="size-3 text-muted-foreground" />
                          {p.api_key_prefix ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell num">
                        {formatNumber(p.visits, lang)}
                      </TableCell>
                      <TableCell className="num">{formatNumber(stats.count, lang)}</TableCell>
                      <TableCell className="hidden lg:table-cell num">
                        {formatPercent(conversion, lang)}
                      </TableCell>
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
                          aria-label={t("landing.copyInstructions")}
                          onClick={() => void copyInstructions(p.slug)}
                        >
                          <FileCode2 className="size-4" />
                        </Button>
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
                          aria-label={t("landing.deleteTitle")}
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
            <DialogTitle>{editing ? t("landing.edit") : t("landing.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="l-name">{t("landing.name")}</Label>
              <Input
                id="l-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="l-slug">{t("products.slug")}</Label>
                <Input
                  id="l-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder={slugify(form.name)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-visits">{t("landing.visits")}</Label>
                <Input
                  id="l-visits"
                  type="number"
                  min="0"
                  value={form.visits}
                  onChange={(e) => setForm({ ...form, visits: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-url">{t("landing.url")}</Label>
              <Input
                id="l-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("landing.product")}</Label>
              <Select
                value={form.product_id}
                onValueChange={(v) => setForm({ ...form, product_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("common.none")}</SelectItem>
                  {(products ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="l-active">{t("common.active")}</Label>
              <Switch
                id="l-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={savePage.isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("landing.apiKeyGenerated")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("landing.apiKeyWarning")}</p>
            <div className="space-y-1.5">
              <Label htmlFor="generated-api-key">{t("landing.apiKeyLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="generated-api-key"
                  readOnly
                  value={generatedApiKey ?? ""}
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={() => void copyApiKey()}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="mb-2 text-sm font-medium">{t("landing.instructionsTitle")}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                {generatedApiKey
                  ? buildIntegrationSnippet(form.slug.trim() || slugify(form.name), generatedApiKey)
                  : ""}
              </pre>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => void copyApiKey()}>
              <Copy className="mr-2 size-4" />
              {t("landing.copyApiKey")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (generatedApiKey) {
                  void copyInstructions(form.slug.trim() || slugify(form.name), generatedApiKey);
                }
              }}
            >
              <FileCode2 className="mr-2 size-4" />
              {t("landing.copyInstructions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("landing.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDelete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  await deletePage.mutateAsync(pendingDelete.id);
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

import type { Lang } from "./i18n";

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-info/12 text-info border-info/25",
  confirmed: "bg-primary/12 text-primary border-primary/25",
  preparing: "bg-accent/20 text-accent-foreground border-accent/40",
  shipped: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  delivered: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/12 text-destructive border-destructive/25",
  returned: "bg-muted text-muted-foreground border-border",
};

export const SOURCES = [
  "facebook",
  "tiktok",
  "instagram",
  "google",
  "whatsapp",
  "organic",
] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  organic: "Organic",
};

const LOCALES: Record<Lang, string> = { fr: "fr-MA", ar: "ar-MA", en: "en-US" };

export function formatCurrency(value: number, lang: Lang = "fr") {
  const n = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return lang === "ar" ? `${n} د.م.` : `${n} DH`;
}

export function formatNumber(value: number, lang: Lang = "fr") {
  return new Intl.NumberFormat(LOCALES[lang]).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null | undefined, lang: Lang = "fr") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined, lang: Lang = "fr") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercent(value: number, lang: Lang = "fr") {
  return `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 1 }).format(
    Number.isFinite(value) ? value : 0,
  )} %`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Short chime played when a new order lands, using the Web Audio API. */
export function playNewOrderChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.34);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* audio is optional */
  }
}

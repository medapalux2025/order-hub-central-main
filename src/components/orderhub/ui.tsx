import { useState, type ReactNode } from "react";

import { Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { STATUS_STYLES, type OrderStatus } from "@/lib/orderhub";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function CustomerCell({ name, phone }: { name: string; phone: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copyPhone(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="block font-medium leading-tight">{name}</span>
      <div className="flex items-center gap-1.5">
        <a
          href={`tel:${phone}`}
          className="num text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {phone}
        </a>
        <button
          type="button"
          onClick={copyPhone}
          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("common.copy")}
        >
          {copied ? (
            <span className="text-success">{t("common.copied")}</span>
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "accent" | "success" | "destructive";
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    accent: "bg-accent/25 text-accent-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/12 text-destructive",
  };
  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="num mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

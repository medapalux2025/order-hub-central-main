import type { ComponentProps } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n, type Lang } from "@/lib/i18n";
import { formatCurrency, formatDateTime, SOURCE_LABELS } from "@/lib/orderhub";
import type { Order } from "@/lib/data";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLabelHtml(order: Order, lang: Lang, t: (key: string) => string): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const total = formatCurrency(Number(order.total_price), lang);
  const date = formatDateTime(order.created_at, lang);
  const source = SOURCE_LABELS[order.source] ?? order.source;
  const product = order.product?.name ?? "—";
  const city = order.city ?? "—";
  const address = order.address ?? "—";
  const landing = order.landing_page?.name ?? "—";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${t("orders.printTitle")} #${order.order_number}</title>
<style>
  @page { size: 100mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.35; }
  .label { width: 100mm; min-height: 150mm; padding: 6mm; display: flex; flex-direction: column; gap: 4mm; }
  .brand { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #000; padding-bottom: 2mm; }
  .order-number { font-size: 24px; font-weight: 800; line-height: 1; }
  .section { border-bottom: 1px dashed #000; padding-bottom: 3mm; }
  .section:last-of-type { border-bottom: none; }
  .label-text { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #333; letter-spacing: 0.3px; margin-bottom: 0.5mm; }
  .value { font-size: 14px; font-weight: 700; }
  .large { font-size: 18px; font-weight: 800; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  .spacer { margin-top: 2mm; }
  .footer { margin-top: auto; font-size: 10px; color: #333; border-top: 1px solid #000; padding-top: 2mm; }
</style>
</head>
<body>
  <div class="label">
    <div class="brand">OrderHub</div>
    <div class="order-number">#${order.order_number}</div>

    <div class="section">
      <div class="label-text">${t("orders.customer")}</div>
      <div class="value">${escapeHtml(order.customer_name)}</div>
      <div class="value">${escapeHtml(order.phone)}</div>
    </div>

    <div class="section">
      <div class="label-text">${t("orders.city")}</div>
      <div class="value">${escapeHtml(city)}</div>
      <div class="label-text spacer">${t("orders.address")}</div>
      <div class="value">${escapeHtml(address)}</div>
    </div>

    <div class="section">
      <div class="label-text">${t("orders.product")}</div>
      <div class="value">${escapeHtml(product)}</div>
      <div class="row spacer">
        <div>
          <div class="label-text">${t("orders.qty")}</div>
          <div class="value">×${order.quantity}</div>
        </div>
        <div style="text-align: end;">
          <div class="label-text">${t("orders.totalPrice")}</div>
          <div class="large">${total}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="row">
        <div>
          <div class="label-text">${t("orders.paymentMethod")}</div>
          <div class="value">${t("orders.cod")}</div>
        </div>
        <div style="text-align: end;">
          <div class="label-text">${t("orders.source")}</div>
          <div class="value">${escapeHtml(source)}</div>
        </div>
      </div>
      <div class="spacer">
        <div class="label-text">${t("orders.landing")}</div>
        <div class="value">${escapeHtml(landing)}</div>
      </div>
    </div>

    <div class="footer">
      ${t("orders.printTitle")} — ${date}
    </div>
  </div>
</body>
</html>`;
}

function printOrderLabel(order: Order, lang: Lang, t: (key: string) => string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "100mm";
  iframe.style.height = "150mm";
  iframe.style.border = "none";
  iframe.srcdoc = buildLabelHtml(order, lang, t);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }

  iframe.addEventListener("load", () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.addEventListener("afterprint", cleanup);
    win.focus();
    win.print();
    // Fallback cleanup if afterprint doesn't fire.
    setTimeout(cleanup, 60000);
  });

  document.body.appendChild(iframe);
}

type OrderPrintButtonProps = {
  order: Order;
} & ComponentProps<typeof Button>;

export function OrderPrintButton({ order, children, ...props }: OrderPrintButtonProps) {
  const { t, lang } = useI18n();
  return (
    <Button type="button" {...props} onClick={() => printOrderLabel(order, lang, t)}>
      {children ?? (
        <>
          <Printer className="size-4" />
          <span>{t("orders.print")}</span>
        </>
      )}
    </Button>
  );
}

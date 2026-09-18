import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  BellOff,
  Boxes,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { LANGS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSessionUser } from "@/hooks/use-session-user";
import { useNewOrders } from "@/lib/data";
import {
  areNotificationsEnabled,
  isNotificationGranted,
  requestNotificationPermission,
  setNotificationsEnabled,
} from "@/lib/notifications";

type NavItem = {
  to: string;
  key: string;
  shortKey: string;
  icon: LucideIcon;
  badge?: true;
  mobile?: true;
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    key: "nav.dashboard",
    shortKey: "nav.dashboardShort",
    icon: LayoutDashboard,
    mobile: true,
  },
  {
    to: "/new-orders",
    key: "nav.newOrders",
    shortKey: "nav.newOrdersShort",
    icon: Inbox,
    badge: true,
    mobile: true,
  },
  {
    to: "/orders",
    key: "nav.orders",
    shortKey: "nav.ordersShort",
    icon: BarChart3,
    mobile: true,
  },
  {
    to: "/products",
    key: "nav.products",
    shortKey: "nav.productsShort",
    icon: Package,
    mobile: true,
  },
  {
    to: "/landing-pages",
    key: "nav.landing",
    shortKey: "nav.landingShort",
    icon: Boxes,
  },
  {
    to: "/customers",
    key: "nav.customers",
    shortKey: "nav.customersShort",
    icon: Users,
    mobile: true,
  },
  {
    to: "/settings",
    key: "nav.settings",
    shortKey: "nav.settingsShort",
    icon: Settings,
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: newOrders } = useNewOrders();
  const newCount = (newOrders ?? []).length;

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        const badge = item.badge ? newCount : null;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{t(item.key)}</span>
            {badge ? (
              <span className="num grid min-w-[1.25rem] place-items-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="grid size-9 place-items-center rounded-xl bg-sidebar-primary font-display text-sm font-extrabold text-sidebar-primary-foreground">
        OH
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-bold text-sidebar-foreground">
          OrderHub
        </span>
        <span className="block text-[11px] text-sidebar-foreground/60">{t("brand.tagline")}</span>
      </span>
    </div>
  );
}

function ConnectionIndicator() {
  const { t } = useI18n();
  const online = useNetworkStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "grid size-8 place-items-center rounded-full border",
            online
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          aria-label={online ? t("common.online") : t("common.offline")}
        >
          {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        </div>
      </TooltipTrigger>
      <TooltipContent>{online ? t("common.online") : t("common.offline")}</TooltipContent>
    </Tooltip>
  );
}

function NotificationToggle() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(
    () => typeof window !== "undefined" && isNotificationGranted() && areNotificationsEnabled(),
  );

  if (typeof window === "undefined" || !("Notification" in window)) return null;

  async function toggle() {
    if (!enabled) {
      const granted = await requestNotificationPermission();
      setEnabled(granted);
      toast.success(granted ? t("dash.notificationsEnabled") : t("dash.notificationsDisabled"));
    } else {
      setNotificationsEnabled(false);
      setEnabled(false);
      toast.success(t("dash.notificationsDisabled"));
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => void toggle()}
          aria-label={t("dash.notifications")}
        >
          {enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("dash.notifications")}</TooltipContent>
    </Tooltip>
  );
}

function MobileBottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: newOrders } = useNewOrders();
  const newCount = (newOrders ?? []).length;
  const items = NAV.filter((item) => item.mobile);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          const badge = item.badge ? newCount : null;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-xl transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="max-w-full truncate px-0.5 leading-none">{t(item.shortKey)}</span>
              {active ? (
                <span className="absolute inset-x-1 top-0 h-0.5 rounded-b-full bg-sidebar-primary" />
              ) : null}
              {badge ? (
                <span className="num absolute end-1 top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-sidebar-primary px-1 py-0 text-[9px] font-bold text-sidebar-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useSessionUser();
  useRealtimeOrders();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col justify-between bg-sidebar p-4 lg:flex">
          <div className="space-y-6">
            <Brand />
            <NavLinks />
          </div>
          <div className="space-y-3">
            {user ? (
              <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
                  {user.role}
                </p>
              </div>
            ) : null}
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              {t("nav.signOut")}
            </Button>
          </div>
        </aside>

        <div className="lg:ms-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label={t("nav.openMenu")}
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-none bg-sidebar p-4">
                  <SheetTitle className="sr-only">OrderHub</SheetTitle>
                  <div className="space-y-6">
                    <Brand />
                    <NavLinks onNavigate={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              <span className="font-display text-base font-bold lg:hidden">OrderHub</span>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionIndicator />
              <NotificationToggle />
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                onClick={() => navigate({ to: "/settings" })}
                aria-label={t("nav.settings")}
              >
                <Settings className="size-4" />
              </Button>
              <Select value={lang} onValueChange={(v) => setLang(v as typeof lang)}>
                <SelectTrigger className="h-9 w-[124px]" aria-label={t("common.language")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={handleSignOut}
                aria-label={t("nav.signOut")}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-8">
            {children}
          </main>
        </div>

        <MobileBottomNav />
      </div>
    </TooltipProvider>
  );
}

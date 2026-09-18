import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Mail, UserCircle, ShieldCheck, Smartphone } from "lucide-react";

import { PageHeader } from "@/components/orderhub/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useSessionUser } from "@/hooks/use-session-user";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: user, isLoading } = useSessionUser();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  const [name, setName] = useState(user?.name ?? "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["session-user"] });
      toast.success(t("settings.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate with the current password before changing it.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw signInError;

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-5 text-primary" />
              {t("settings.account")}
            </CardTitle>
            <CardDescription>{t("settings.accountDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("settings.name")}
              </p>
              <p className="font-medium">{isLoading ? "—" : user?.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("settings.email")}
              </p>
              <p className="flex items-center gap-2 font-medium">
                <Mail className="size-4 text-muted-foreground" />
                {isLoading ? "—" : user?.email}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("settings.role")}
              </p>
              <p className="inline-flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-muted-foreground" />
                {isLoading ? "—" : user?.role}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profile")}</CardTitle>
            <CardDescription>{t("settings.profileDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={updateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("settings.name")}</Label>
                <Input
                  id="fullName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("settings.name")}
                />
              </div>
              <Button type="submit" disabled={updatingProfile || !name.trim()}>
                {updatingProfile ? t("common.loading") : t("settings.updateProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.password")}</CardTitle>
            <CardDescription>{t("settings.passwordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t("settings.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? t("common.loading") : t("settings.changePassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              {t("settings.install")}
            </CardTitle>
            <CardDescription>{t("settings.installDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isInstalled ? (
              <p className="text-sm text-muted-foreground">{t("settings.installed")}</p>
            ) : canInstall ? (
              <Button onClick={() => void promptInstall()}>
                <Download className="me-1.5 size-4" />
                {t("settings.installButton")}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("settings.installUnavailable")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

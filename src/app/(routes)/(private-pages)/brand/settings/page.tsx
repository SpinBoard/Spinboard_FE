"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertTriangle,
  Mail,
  Megaphone,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { useSetAtom } from "jotai";
import { userAtom } from "@/atom/user";
import { toast } from "sonner";
import { routes } from "@/app/_utils/routes";
import { useSettings } from "@/hooks/use-settings";
import { NotifRow } from "@/components/settings/notif-toggle";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { BrandSettings, SettingsNotificationPrefs } from "@/types";

// RESTYLE (design/DECISIONS.md #22) — the mockup doesn't cover settings.
// This is password and notifications only; billing is a separate, unbuilt
// screen (b-billing) per that same ruling. All fetches/mutations unchanged.
export default function BrandSettingsPage() {
  const setUser = useSetAtom(userAtom);
  const router = useRouter();
  const { data: settings, error: settingsError, isLoading: loadingSettings } = useSettings();
  const brandSettings = settings?.role === "brand" ? (settings as BrandSettings) : undefined;

  // ── Password ──────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<SettingsNotificationPrefs>({
    emailNotifications: true,
    leaderboardUpdates: true,
    newCampaignAlerts: true,
    weeklyDigest: false,
  });
  const [notifsDirty, setNotifsDirty] = useState(false);

  // ── Delete account ───────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    if (brandSettings?.notifications) setNotifs(brandSettings.notifications);
  }, [brandSettings]);

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.patch(ENDPOINTS.CHANGE_PASSWORD, payload),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to change password.");
    },
  });

  const saveNotifsMutation = useMutation({
    mutationFn: (payload: SettingsNotificationPrefs) =>
      api.patch(ENDPOINTS.UPDATE_NOTIFICATIONS, payload),
    onSuccess: () => {
      toast.success("Notification preferences saved.");
      setNotifsDirty(false);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to save preferences.");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (payload: { password: string }) =>
      api.delete(ENDPOINTS.DELETE_ACCOUNT, { data: payload }),
    onSuccess: () => {
      toast.success("Account deleted.");
      setUser(null);
      router.push(routes.HOME);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to delete account.");
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const updateNotif = (key: keyof SettingsNotificationPrefs, value: boolean) => {
    setNotifs((p) => ({ ...p, [key]: value }));
    setNotifsDirty(true);
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      toast.error("Please enter your password to confirm.");
      return;
    }
    deleteAccountMutation.mutate({ password: deletePassword });
  };

  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  if (loadingSettings) return <PageLoader withLayout={false} message="Loading settings..." />;

  if (settingsError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Settings"
        message="Unable to load your settings. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Settings
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Manage your account, security, and notifications.
        </p>
      </div>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Account</h3>
        <div className="mt-3">
          <LimitRow label="Email" value={brandSettings?.email ?? "—"} />
          <LimitRow label="Company" value={brandSettings?.account.companyName || "—"} />
        </div>
        <Link href={routes.BRAND.PROFILE} className="inline-block mt-3">
          <Button variant="ghost" size="sm">Edit profile</Button>
        </Link>
      </Card>

      {/* ── Security ───────────────────────────────────────────────────────── */}
      {brandSettings?.hasPassword !== false && (
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Change password</h3>
          <p className="fb-hint mt-1">Use a strong password you don&apos;t use anywhere else.</p>

          <div className="mt-3 space-y-2.5">
            <Field label="Current password">
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--faint)" }}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="New password">
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--faint)" }}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm new password" hint={!passwordsMatch ? "Passwords do not match." : undefined}>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ paddingRight: 36, borderColor: !passwordsMatch ? "var(--spent)" : undefined }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--faint)" }}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button variant="primary" onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change password"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Notifications</h3>
        <p className="fb-hint mt-1">Choose what you want to hear about.</p>

        <div className="mt-2">
          <NotifRow
            icon={Mail}
            label="Email notifications"
            description="General account and activity emails."
            checked={notifs.emailNotifications}
            onChange={(v) => updateNotif("emailNotifications", v)}
          />
          <NotifRow
            icon={Megaphone}
            label="New campaign alerts"
            description="Updates on your campaigns' status."
            checked={notifs.newCampaignAlerts}
            onChange={(v) => updateNotif("newCampaignAlerts", v)}
          />
          <NotifRow
            icon={Mail}
            label="Weekly digest"
            description="A weekly summary email."
            checked={notifs.weeklyDigest}
            onChange={(v) => updateNotif("weeklyDigest", v)}
          />
        </div>

        {notifsDirty && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
            <Button variant="primary" onClick={() => saveNotifsMutation.mutate(notifs)} disabled={saveNotifsMutation.isPending}>
              {saveNotifsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save preferences"}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <Card style={{ borderColor: "rgba(255,77,94,.3)" }}>
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--spent)" }}>
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </h3>
        <p className="fb-hint mt-1">Deleting your account is permanent and cannot be undone.</p>
        <Button variant="danger" className="mt-3" onClick={() => setShowDeleteModal(true)}>
          <Trash2 className="h-4 w-4" />
          Delete account
        </Button>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={(open) => !deleteAccountMutation.isPending && setShowDeleteModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "var(--spent)" }}>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your brand account and all associated campaigns. Enter
              your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Password">
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </Field>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1 justify-center" onClick={handleDeleteAccount} disabled={deleteAccountMutation.isPending}>
                {deleteAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 justify-center"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteAccountMutation.isPending}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

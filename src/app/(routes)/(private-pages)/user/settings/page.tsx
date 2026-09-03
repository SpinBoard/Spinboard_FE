"use client";

import { useEffect, useState } from "react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
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
  Trophy,
  Mail,
  BarChart3,
  Megaphone,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { useSetAtom } from "jotai";
import { userAtom } from "@/atom/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useSettings } from "@/hooks/use-settings";
import { NotifRow, Toggle } from "@/components/settings/notif-toggle";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { ViewerSettings, SettingsNotificationPrefs } from "@/types";

// RESTYLE (design/DECISIONS.md #8) — the mockup doesn't cover settings;
// styled with Card/Field/Input/LimitRow per that ruling. All fetches and
// mutations are unchanged. The delete-account copy's old "puzzle progress"
// line was leftover SpinBoard-era language (per CLAUDE.md's warning), fixed
// to describe real data. Referral bonus alerts removed 2026-08-29 — the
// referral feature was cut on both frontend and backend.
export default function SettingsPage() {
  const setUser = useSetAtom(userAtom);
  const router = useRouter();
  const { data: settings, error: settingsError, isLoading: loadingSettings } = useSettings();
  const viewerSettings = settings?.role === "viewer" ? (settings as ViewerSettings) : undefined;

  // ── Password ────────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<SettingsNotificationPrefs>({
    emailNotifications: true,
    leaderboardUpdates: true,
    newCampaignAlerts: true,
    weeklyDigest: false,
  });
  const [notifsDirty, setNotifsDirty] = useState(false);

  // ── Privacy ─────────────────────────────────────────────────────────────────
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [privacyDirty, setPrivacyDirty] = useState(false);

  // ── Delete account ──────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    if (viewerSettings?.notifications) setNotifs(viewerSettings.notifications);
    if (viewerSettings?.privacy) setShowOnLeaderboard(viewerSettings.privacy.showOnLeaderboard ?? true);
  }, [viewerSettings]);

  // ── Mutations ───────────────────────────────────────────────────────────────
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

  const savePrivacyMutation = useMutation({
    mutationFn: (payload: { showOnLeaderboard: boolean }) =>
      api.patch(ENDPOINTS.UPDATE_PRIVACY, payload),
    onSuccess: () => {
      toast.success("Privacy settings saved.");
      setPrivacyDirty(false);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to save privacy settings.");
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

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  if (loadingSettings) {
    return <PageLoader withLayout={false} message="Loading settings..." />;
  }

  if (settingsError) {
    return (
      <PageError
        withLayout={false}
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
          Manage your security, notifications, and privacy.
        </p>
      </div>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Account</h3>
        <div className="mt-3">
          <LimitRow label="Email" value={viewerSettings?.email ?? "—"} />
          <LimitRow label="Username" value={viewerSettings?.account.username || "—"} />
        </div>
        <Link href={routes.USER.PROFILE} className="inline-block mt-3">
          <Button variant="ghost" size="sm">Edit profile</Button>
        </Link>
      </Card>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      {viewerSettings?.hasPassword !== false && (
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
                  placeholder="Repeat new password"
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

            <Button
              variant="primary"
              onClick={handleChangePassword}
              disabled={
                changePasswordMutation.isPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                !passwordsMatch
              }>
              {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Notifications</h3>
        <p className="fb-hint mt-1">Choose what you want to be notified about.</p>

        <div className="mt-2">
          <NotifRow
            icon={Mail}
            label="Email notifications"
            description="Master toggle — turns all email alerts on or off."
            checked={notifs.emailNotifications}
            onChange={(v) => updateNotif("emailNotifications", v)}
          />
          <NotifRow
            icon={BarChart3}
            label="Leaderboard updates"
            description="Know when your position on the weekly leaderboard changes significantly."
            checked={notifs.leaderboardUpdates}
            onChange={(v) => updateNotif("leaderboardUpdates", v)}
            disabled={!notifs.emailNotifications}
          />
          <NotifRow
            icon={Megaphone}
            label="New campaign alerts"
            description="Be the first to know when new brand campaigns go live."
            checked={notifs.newCampaignAlerts}
            onChange={(v) => updateNotif("newCampaignAlerts", v)}
            disabled={!notifs.emailNotifications}
          />
          <NotifRow
            icon={Trophy}
            label="Weekly progress summary"
            description="Receive a weekly email recap of your activity and ranking."
            checked={notifs.weeklyDigest}
            onChange={(v) => updateNotif("weeklyDigest", v)}
            disabled={!notifs.emailNotifications}
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

      {/* ── Privacy ────────────────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Privacy</h3>
        <p className="fb-hint mt-1">Control how others see you on the platform.</p>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--free)" }} />
            <div className="min-w-0">
              <p style={{ fontSize: 13, color: "var(--txt)" }}>Show on public leaderboard</p>
              <p className="fb-hint mt-0.5">When off, your name and score are hidden from the weekly leaderboard.</p>
            </div>
          </div>
          <Toggle
            checked={showOnLeaderboard}
            onChange={(v) => {
              setShowOnLeaderboard(v);
              setPrivacyDirty(true);
            }}
          />
        </div>

        {privacyDirty && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
            <Button variant="primary" onClick={() => savePrivacyMutation.mutate({ showOnLeaderboard })} disabled={savePrivacyMutation.isPending}>
              {savePrivacyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save privacy settings"}
            </Button>
          </div>
        )}
      </Card>

      {/* ── Danger Zone ────────────────────────────────────────────────────── */}
      <Card style={{ borderColor: "rgba(255,77,94,.3)" }}>
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--spent)" }}>
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </h3>
        <p className="fb-hint mt-1">Irreversible actions — proceed with caution.</p>

        <div className="mt-3 flex items-center justify-between gap-4 p-3 rounded-lg" style={{ background: "rgba(255,77,94,.06)", border: "1px solid rgba(255,77,94,.2)" }}>
          <div className="min-w-0">
            <p style={{ fontSize: 13, color: "var(--txt)" }}>Delete account</p>
            <CardNote className="mt-1">
              Permanently removes your account, wallet balance, and freebie claims.
              This cannot be undone.
            </CardNote>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open);
          if (!open) setDeletePassword("");
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--spent)" }}>
              <AlertTriangle className="h-5 w-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all data — wallet balance and
              freebie claims included. This action <b>cannot</b> be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Field label="Enter your password to confirm">
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your current password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDeleteAccount();
                }}
              />
            </Field>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteAccountMutation.isPending || !deletePassword}>
                {deleteAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete my account"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

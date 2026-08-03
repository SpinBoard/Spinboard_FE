"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  Loader2,
  AlertTriangle,
  Mail,
  Megaphone,
  Zap,
  UserCog,
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
    referralBonusAlerts: true,
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

  if (loadingSettings) return <PageLoader message="Loading settings..." />;

  if (settingsError) {
    return (
      <PageError
        title="Failed to Load Settings"
        message="Unable to load your settings. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 font-sora flex items-center gap-3">
          <Shield className="h-8 w-8 text-secondary" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account, security, and notifications.</p>
      </div>

      {/* ── Account ────────────────────────────────────────────────────────── */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora flex items-center gap-2">
            <UserCog className="h-5 w-5 text-secondary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{brandSettings?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Company</span>
            <span className="text-foreground">{brandSettings?.account.companyName || "—"}</span>
          </div>
          <Link href={routes.BRAND.PROFILE}>
            <Button variant="outline" size="sm" className="w-full border-border text-foreground hover:bg-white/10 mt-2">
              Edit Profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* ── Security ───────────────────────────────────────────────────────── */}
      {brandSettings?.hasPassword !== false && (
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-foreground font-sora flex items-center gap-2">
              <Lock className="h-5 w-5 text-secondary" />
              Change Password
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Use a strong password you don&apos;t use anywhere else.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-sm">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-sm">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground/80 text-sm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!passwordsMatch && (
                <p className="text-destructive text-xs">Passwords do not match.</p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Notifications ──────────────────────────────────────────────────── */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora">Notifications</CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose what you want to hear about.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotifRow
            icon={Mail}
            label="Email Notifications"
            description="General account and activity emails."
            checked={notifs.emailNotifications}
            onChange={(v) => updateNotif("emailNotifications", v)}
          />
          <NotifRow
            icon={Zap}
            label="Referral Bonus Alerts"
            description="Get notified when a referral converts."
            checked={notifs.referralBonusAlerts}
            onChange={(v) => updateNotif("referralBonusAlerts", v)}
          />
          <NotifRow
            icon={Megaphone}
            label="New Campaign Alerts"
            description="Updates on your campaigns' status."
            checked={notifs.newCampaignAlerts}
            onChange={(v) => updateNotif("newCampaignAlerts", v)}
          />
          <NotifRow
            icon={Mail}
            label="Weekly Digest"
            description="A weekly summary email."
            checked={notifs.weeklyDigest}
            onChange={(v) => updateNotif("weeklyDigest", v)}
          />
          {notifsDirty && (
            <Button
              onClick={() => saveNotifsMutation.mutate(notifs)}
              disabled={saveNotifsMutation.isPending}
              className="mt-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground">
              {saveNotifsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Preferences
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Danger zone ────────────────────────────────────────────────────── */}
      <Card className="bg-destructive/5 backdrop-blur-sm border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive font-sora flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Deleting your account is permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowDeleteModal(true)}
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteModal} onOpenChange={(open) => !deleteAccountMutation.isPending && setShowDeleteModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sora text-xl text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your brand account and all associated campaigns. Enter
              your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                variant="destructive"
                className="flex-1">
                {deleteAccountMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Delete Permanently
              </Button>
              <Button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteAccountMutation.isPending}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-white/10">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

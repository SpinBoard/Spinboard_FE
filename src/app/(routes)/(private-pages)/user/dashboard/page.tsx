"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet as WalletIcon,
  Trophy,
  Users,
  Share2,
  Copy,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { SpinMachine } from "@/components/spin/spin-machine";
import { WalletBalanceResponse, ReferralMyStatsResponse, TryAgainStatusResponse } from "@/types";

export default function UserDashboardPage() {
  const [referralCopied, setReferralCopied] = useState(false);
  const user = useAtomValue(userAtom);
  const referralLink =
    user?.username && typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${user.username}`
      : "";

  const { data: balanceData, isLoading: loadingBalance } = useQuery<WalletBalanceResponse>({
    queryKey: ["wallet-balance"],
    queryFn: () => api.get<WalletBalanceResponse>(ENDPOINTS.WALLET_BALANCE).then((res) => res.data),
    enabled: !!user?.accessToken,
  });

  const { data: tryAgain, isLoading: loadingTryAgain } = useQuery<TryAgainStatusResponse>({
    queryKey: ["try-again-status"],
    queryFn: () => api.get<TryAgainStatusResponse>(ENDPOINTS.TRY_AGAIN_STATUS).then((res) => res.data),
    enabled: !!user?.accessToken,
  });

  const { data: referralStats, isLoading: loadingReferrals } = useQuery<ReferralMyStatsResponse["stats"]>({
    queryKey: ["referrals-my-stats"],
    queryFn: () =>
      api.get<ReferralMyStatsResponse>(ENDPOINTS.REFERRALS_MY_STATS()).then((res) => res.data.stats),
    enabled: !!user?.accessToken,
    retry: false,
  });

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <MainLayout maxWidth="6xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 font-sora">
            Welcome back{user?.username ? `, @${user.username}` : ""}!
          </h1>
          <p className="text-muted-foreground">Watch ads, spin to win, and track your rewards.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <WalletIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {loadingBalance ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground font-sora">
                      {balanceData?.currency ?? "₦"}
                      {(balanceData?.balance ?? 0).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Trophy className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  {loadingTryAgain ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground font-sora">
                      {tryAgain?.tryAgainCount ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Try-Agains</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  {loadingReferrals ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground font-sora">
                      {referralStats?.totalReferrals ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border flex flex-col justify-center items-center text-center p-8 space-y-4">
            <PlayCircle className="h-10 w-10 text-primary" />
            <div>
              <h3 className="font-sora text-xl font-bold text-foreground">Ready to earn?</h3>
              <p className="text-muted-foreground text-sm">
                Watch a video, answer 3 questions, and work toward your next spin.
              </p>
            </div>
            <Link href={routes.WATCH}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Watch &amp; Earn
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </Card>

          <SpinMachine />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground font-sora text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-secondary" />
                    Refer Friends
                  </CardTitle>
                  <CardDescription>
                    20 qualified referrals earns 20% off, 40 earns 50% off.
                  </CardDescription>
                </div>
                <Link href={routes.USER.REFERRALS}>
                  <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-white/10">
                    Details
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-white/5 rounded border border-border overflow-hidden">
                    <code className="text-foreground/80 text-sm break-all">
                      {referralLink || "Loading your referral link..."}
                    </code>
                  </div>
                  <Button
                    onClick={copyReferralLink}
                    disabled={!referralLink}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {referralCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (navigator.share && referralLink) {
                    navigator
                      .share({
                        title: "Join Spinboard",
                        text: "Watch ads, answer quizzes, and spin to win real rewards. Sign up with my link!",
                        url: referralLink,
                      })
                      .catch(() => {});
                  } else {
                    copyReferralLink();
                  }
                }}
                disabled={!referralLink}
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                <Share2 className="h-4 w-4 mr-2" />
                Share Invitation
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-sora text-xl flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-secondary" />
                Marketplace
              </CardTitle>
              <CardDescription>Spend cash or discount codes on digital products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={routes.MARKETPLACE}>
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-white/10">
                  Browse Marketplace
                </Button>
              </Link>
              <Link href={routes.USER.MARKETPLACE_ORDERS}>
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-white/10">
                  View Your Orders
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

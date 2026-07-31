"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  CheckCircle2,
  Gift,
  UserPlus,
  Zap,
  Info,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { endpointUrl } from "@/app/_utils/helper";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  ReferralEventsResponse,
  ReferralMyStatsResponse,
} from "@/types";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { PageLoader } from "@/components/ui/page-loader";

const getInitials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

export default function ReferralsPage() {
  const user = useAtomValue(userAtom);
  const [copied, setCopied] = useState(false);

  const referralLink =
    user?.username && typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${user.username}`
      : "";

  // Own referral stats (authenticated endpoint). No period filter is sent —
  // the backend moved to a weekly system and a hardcoded ?month= filter no
  // longer fits; the endpoint's default ("current period") is used instead.
  const { data: myStatsData, isLoading: loadingMyStats } =
    useQuery<ReferralMyStatsResponse>({
      queryKey: ["referrals-my-stats"],
      queryFn: () =>
        axios
          .get<ReferralMyStatsResponse>(
            endpointUrl(ENDPOINTS.REFERRALS_MY_STATS()),
            { headers: { Authorization: `Bearer ${user?.accessToken}` } }
          )
          .then((res) => res.data),
      enabled: !!user?.accessToken,
    });

  // Referral event log — public
  const { data: eventsData } = useQuery({
    queryKey: ["referrals-events"],
    queryFn: () =>
      axios
        .get<ReferralEventsResponse>(endpointUrl(ENDPOINTS.REFERRALS_EVENTS))
        .then((res) => res.data),
  });

  const stats = myStatsData?.stats;
  // §6: qualification is now anti-fraud gated (verified email + complete
  // profile + one full 5-ad cycle), and rewards are discount codes at 20/40
  // qualified referrals, not points — the underlying GET /referrals/my-stats
  // route is unchanged, so its "successful"/"pending" counts are reused here
  // as qualified/pending against the new 20 & 40 thresholds.
  const qualifiedCount = stats?.successfulReferralsThisMonth ?? 0;
  const pendingCount = stats?.pendingReferrals ?? 0;
  const referredUsers = stats?.referredUsersThisMonth ?? [];
  const distanceTo20 = Math.max(0, 20 - qualifiedCount);
  const distanceTo40 = Math.max(0, 40 - qualifiedCount);

  const events = eventsData?.events || [];

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Spinboard",
          text: "Watch ads, answer quizzes, and spin to win real rewards. Sign up with my link!",
          url: referralLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyReferralLink();
    }
  };

  if (loadingMyStats) {
    return <PageLoader message="Loading your referrals..." />;
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 font-sora flex items-center gap-3">
            <Gift className="h-8 w-8 text-secondary" />
            Refer &amp; Earn
          </h1>
          <p className="text-white/70">
            Invite friends — 20 qualified referrals earns a 20% off code, 40 earns 50% off.
          </p>
        </div>

        {/* How it works banner */}
        <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-xl flex items-start gap-3">
          <Info className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-white/80 space-y-1">
            <p>
              A referral becomes <span className="text-secondary font-semibold">qualified</span>{" "}
              once your friend verifies their email, completes their profile, and
              finishes one full 5-ad watch cycle.
            </p>
            <p className="text-white/50 text-xs">
              {distanceTo20 > 0
                ? `${distanceTo20} more qualified referral${distanceTo20 !== 1 ? "s" : ""} unlocks a 20% off code.`
                : distanceTo40 > 0
                  ? `20% off unlocked! ${distanceTo40} more unlocks a 50% off code.`
                  : "Both the 20% and 50% off codes are unlocked!"}
            </p>
          </div>
        </div>

        {/* Referral Link Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white font-sora text-xl flex items-center gap-2">
              <Share2 className="h-5 w-5 text-secondary" />
              Your Referral Link
            </CardTitle>
            <CardDescription className="text-white/70">
              Share this link — qualified referrals count toward your 20%/50% off codes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user?.username ? (
              <p className="text-white/50 text-sm">
                Set a username on your profile to generate your referral link.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="flex-1 p-3 bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                  <code className="text-white/80 text-sm break-all">
                    {referralLink}
                  </code>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10">
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    onClick={shareReferralLink}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-sora">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <UserPlus className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-sora">
                    {qualifiedCount}
                  </p>
                  <p className="text-xs text-white/60 uppercase tracking-wider">
                    Qualified Referrals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Zap className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-sora">
                    {distanceTo20 > 0 ? distanceTo20 : distanceTo40}
                  </p>
                  <p className="text-xs text-white/60 uppercase tracking-wider">
                    To next {distanceTo20 > 0 ? "20% off" : "50% off"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-white/10 col-span-2 sm:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-sora">
                    {pendingCount}
                  </p>
                  <p className="text-xs text-white/60 uppercase tracking-wider">
                    Pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referred users this month */}
        {referredUsers.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-sora flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-secondary" />
                Qualified Referrals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {referredUsers.map((ru) => (
                  <div
                    key={ru.userId}
                    className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-secondary/20 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {ru.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ru.avatar}
                            alt={ru.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {getInitials(ru.fullName)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {ru.username ? `@${ru.username}` : ru.fullName}
                        </p>
                        <p className="text-white/50 text-xs">
                          {new Date(ru.successfulAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
                      Qualified
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {events.length > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-sora flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-secondary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {events.slice(0, 10).map((event) => {
                  const name =
                    event.referredUser?.username ||
                    (event.referredUser?.firstName
                      ? `${event.referredUser.firstName} ${
                          event.referredUser.lastName || ""
                        }`.trim()
                      : "A friend");
                  const label =
                    event.type === "signup"
                      ? `${name} signed up using your link — pending until they qualify`
                      : `${name} qualified — one step closer to your next discount code`;

                  return (
                    <div
                      key={event._id}
                      className="flex items-center justify-between p-3 border-b border-white/5 last:border-b-0">
                      <span className="text-white/80 text-sm">{label}</span>
                      {event.createdAt && (
                        <span className="text-white/40 text-xs whitespace-nowrap ml-3">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

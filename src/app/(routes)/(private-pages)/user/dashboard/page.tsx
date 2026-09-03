"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet as WalletIcon,
  Gift,
  ArrowRight,
  Store,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { useMyClaims } from "@/hooks/use-freebies";
import { WalletBalanceResponse } from "@/types";

export default function UserDashboardPage() {
  const user = useAtomValue(userAtom);

  const { data: balanceData, isLoading: loadingBalance } =
    useQuery<WalletBalanceResponse>({
      queryKey: ["wallet-balance"],
      queryFn: () =>
        api
          .get<WalletBalanceResponse>(ENDPOINTS.WALLET_BALANCE)
          .then((res) => res.data),
      enabled: !!user?.accessToken,
    });

  const { data: claims, isLoading: loadingClaims } = useMyClaims(
    !!user?.accessToken
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 font-sora">
          Welcome back{user?.username ? `, @${user.username}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Watch the billboard, catch freebie codes, and track your rewards.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Wallet Balance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Gift className="h-5 w-5 text-secondary" />
              </div>
              <div>
                {loadingClaims ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-foreground font-sora">
                    {claims?.length ?? 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Freebies Won
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border flex flex-col justify-center items-center text-center p-8 space-y-4">
        <Tv className="h-10 w-10 text-primary" />
        <div>
          <h3 className="font-sora text-xl font-bold text-foreground">
            The billboard never stops
          </h3>
          <p className="text-muted-foreground text-sm">
            Watch continuously — no gate, no quiz. Catch a freebie code on the
            strip and be first to type it.
          </p>
        </div>
        <Link href={routes.WATCH}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Go to the Billboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-foreground font-sora text-xl flex items-center gap-2">
              <Store className="h-5 w-5 text-secondary" />
              Marketplace
            </CardTitle>
            <CardDescription>
              Browse businesses and contact them directly — no checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={routes.MARKETPLACE}>
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-white/10">
                Browse Marketplace
              </Button>
            </Link>
            <Link href={routes.USER.CLAIMS}>
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-white/10">
                View Your Claims
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

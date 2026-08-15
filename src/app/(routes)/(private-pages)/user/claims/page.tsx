"use client";

import { useAtomValue } from "jotai";
import { Gift, Loader2 } from "lucide-react";
import { userAtom } from "@/atom/user";
import { useMyClaims, useRedeemClaim } from "@/hooks/use-freebies";
import { MainLayout } from "@/components/layout/main-layout";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  ISSUED: "warning",
  REDEEMED: "success",
  VOID: "destructive",
};

export default function ClaimsPage() {
  const user = useAtomValue(userAtom);
  const { data: claims, isLoading } = useMyClaims(!!user?.accessToken);
  const redeemMutation = useRedeemClaim();

  if (isLoading) return <PageLoader message="Loading your claims..." />;

  return (
    <MainLayout maxWidth="3xl">
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Gift className="h-7 w-7 text-secondary" />
            Your Claims
          </h1>
          <p className="text-muted-foreground text-sm">
            Every freebie code you&apos;ve won — nothing here ever expires.
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="font-sora">Claim history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!claims || claims.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No freebie codes claimed yet — catch one on{" "}
                <span className="text-foreground">the Billboard</span>.
              </p>
            ) : (
              <div className="space-y-1">
                {claims.map((claim) => (
                  <div
                    key={claim.claimId}
                    className="flex items-center justify-between gap-3 p-4 border-b border-white/5 last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium text-sm">
                        {claim.valueLabel ?? `${claim.type} — ₦${claim.value ?? ""}`}
                      </p>
                      {claim.secretCode && (
                        <code className="block text-xs font-mono text-muted-foreground break-all mt-0.5">
                          {claim.secretCode}
                        </code>
                      )}
                      {claim.issuedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Won {new Date(claim.issuedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={STATUS_BADGE[claim.status ?? "ISSUED"]}>
                        {claim.status ?? "ISSUED"}
                      </Badge>
                      {claim.status === "ISSUED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={redeemMutation.isPending}
                          onClick={() => redeemMutation.mutate(claim.claimId)}>
                          {redeemMutation.isPending && redeemMutation.variables === claim.claimId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Redeem"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

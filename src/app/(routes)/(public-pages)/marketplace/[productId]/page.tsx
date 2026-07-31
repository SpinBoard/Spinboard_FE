"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Tag, Ticket } from "lucide-react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { userAtom } from "@/atom/user";
import {
  MarketplaceCheckoutResponse,
  MarketplaceProduct,
  MarketplaceProductResponse,
} from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const user = useAtomValue(userAtom);

  const [email, setEmail] = useState(user?.email ?? "");
  const [discountCode, setDiscountCode] = useState("");
  const [delivered, setDelivered] = useState(false);

  const { data: product, isLoading, error } = useQuery<MarketplaceProduct>({
    queryKey: ["marketplace-product", productId],
    queryFn: () =>
      api
        .get<MarketplaceProductResponse>(ENDPOINTS.MARKETPLACE_PRODUCT_DETAILS(productId))
        .then((res) => res.data.product),
    enabled: !!productId,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api
        .post<MarketplaceCheckoutResponse>(ENDPOINTS.MARKETPLACE_CHECKOUT, {
          productId,
          email,
          ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      if (data.deliveredImmediately) {
        setDelivered(true);
        toast.success("100% off applied — delivered instantly!");
        return;
      }
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank");
      }
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Checkout failed — check your discount code and try again.");
    },
  });

  if (isLoading) return <PageLoader message="Loading product..." />;
  if (error || !product) {
    return <PageError title="Product Not Found" message="This product could not be found." showRetry={!!error} />;
  }

  return (
    <MainLayout maxWidth="2xl">
      <Link href={routes.MARKETPLACE}>
        <Button variant="outline" className="border-border text-foreground hover:bg-white/10 mb-5">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </Link>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center gap-1 capitalize">
            <Tag className="h-3 w-3" />
            {product.category}
          </Badge>
          <span className="text-3xl font-bold text-primary font-sora">${product.priceUSD}</span>
        </div>
        <h1 className="font-sora text-2xl font-bold text-foreground">{product.name}</h1>
        <p className="text-muted-foreground">{product.description}</p>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6 space-y-4">
            {delivered ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle className="h-10 w-10 text-success mx-auto" />
                <p className="font-sora text-lg font-bold text-foreground">Delivered!</p>
                <p className="text-sm text-muted-foreground">
                  Check{" "}
                  <Link href={routes.USER.MARKETPLACE_ORDERS} className="text-secondary hover:underline">
                    your orders
                  </Link>{" "}
                  for delivery details.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm text-foreground mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-foreground mb-1.5 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-secondary" />
                    Discount code <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. SPIN20"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Applied and validated at checkout — the final price shows on the payment page.
                  </p>
                </div>
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending || !email}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12">
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Checkout — ${product.priceUSD}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

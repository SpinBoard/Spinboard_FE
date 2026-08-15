"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, ImageOff, Store, Tag } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { ContactLinks } from "@/components/marketplace/contact-links";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { MarketplaceProductResponse } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["marketplace-product", productId],
    queryFn: () =>
      api
        .get<MarketplaceProductResponse>(ENDPOINTS.MARKETPLACE_PRODUCT_DETAILS(productId))
        .then((res) => res.data),
    enabled: !!productId,
    retry: false,
  });

  if (isLoading) return <PageLoader message="Loading product..." />;
  if (error || !data?.product) {
    return <PageError title="Product Not Found" message="This product could not be found." showRetry={!!error} />;
  }

  const { product, business } = data;

  return (
    <MainLayout maxWidth="2xl">
      <Link href={routes.MARKETPLACE}>
        <Button variant="outline" className="border-border text-foreground hover:bg-white/10 mb-5">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </Link>

      <div className="space-y-6">
        <div className="aspect-video bg-white/5 rounded-lg border border-border flex items-center justify-center overflow-hidden">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="flex items-center gap-1 capitalize">
            <Tag className="h-3 w-3" />
            {product.category}
          </Badge>
          {product.priceLabel && (
            <span className="text-xl font-bold text-primary font-sora">{product.priceLabel}</span>
          )}
        </div>
        <h1 className="font-sora text-2xl font-bold text-foreground">{product.name}</h1>
        <p className="text-muted-foreground">{product.description}</p>

        {business && (
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-sora text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-secondary" />
                <Link href={routes.MARKETPLACE_BUSINESS(business.brandId)} className="hover:underline">
                  {business.businessName}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Contact the seller directly about this item.</p>
              <ContactLinks business={business} />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

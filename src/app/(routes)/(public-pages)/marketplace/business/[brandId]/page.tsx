"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, MapPin, Store } from "lucide-react";
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
import { BusinessDetailResponse } from "@/types";

export default function BusinessDetailPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["marketplace-business", brandId],
    queryFn: () =>
      api
        .get<BusinessDetailResponse>(ENDPOINTS.MARKETPLACE_BUSINESS_DETAILS(brandId))
        .then((res) => res.data),
    enabled: !!brandId,
    retry: false,
  });

  if (isLoading) return <PageLoader message="Loading business..." />;
  // A 404 here means "not found or not listed" — the two are never
  // distinguished, so show a generic not-found state either way.
  if (error || !data) {
    return <PageError title="Business Not Found" message="This business could not be found." showRetry={false} />;
  }

  const { business, products } = data;

  return (
    <MainLayout maxWidth="4xl">
      <Link href={routes.MARKETPLACE}>
        <Button variant="outline" className="border-border text-foreground hover:bg-white/10 mb-5">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </Link>

      <div className="space-y-6">
        {business.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.coverImageUrl}
            alt=""
            className="w-full aspect-[3/1] object-cover rounded-lg border border-border"
          />
        )}

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-border flex items-center justify-center flex-shrink-0">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-sora text-2xl font-bold text-foreground">{business.businessName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {business.category?.map((c) => (
                <Badge key={c} variant="secondary" className="capitalize">
                  {c}
                </Badge>
              ))}
              {(business.city || business.state || business.country) && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[business.city, business.state, business.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {business.businessDescription && (
          <p className="text-muted-foreground">{business.businessDescription}</p>
        )}

        <ContactLinks business={business} />

        {products.length > 0 && (
          <div>
            <h2 className="font-sora text-lg font-bold text-foreground mb-3">Products &amp; services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Link key={product._id} href={routes.MARKETPLACE_PRODUCT(product._id)}>
                  <Card className="bg-card/50 backdrop-blur-sm border-border h-full hover:border-primary/50 transition-colors overflow-hidden">
                    <div className="aspect-video bg-white/5 flex items-center justify-center">
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-foreground font-sora text-base">{product.name}</CardTitle>
                      {product.priceLabel && <p className="text-primary text-sm font-semibold">{product.priceLabel}</p>}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

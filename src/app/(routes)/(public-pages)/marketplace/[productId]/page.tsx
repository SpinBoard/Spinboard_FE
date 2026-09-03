"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, ImageOff, Store, Tag } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Card } from "@/components/ui/freebiz-card";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { ContactLinks } from "@/components/marketplace/contact-links";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { MarketplaceProductResponse } from "@/types";

// RESTYLE + rename (design/DECISIONS.md §Marketplace) — see the browse
// page's note on the "Brands" rename. Fetch unchanged; this page's own
// test suite (no checkout, priceLabel as-is, tappable contact links) is
// unaffected by the copy/styling change.
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
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Button>
      </Link>

      <div className="space-y-4">
        <div className="aspect-video rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="h-10 w-10" style={{ color: "var(--faint)" }} />
          )}
        </div>

        <div className="flex items-center justify-between">
          <Pill><Tag className="h-3 w-3" /><span style={{ textTransform: "capitalize" }}>{product.category}</span></Pill>
          {product.priceLabel && (
            <span style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{product.priceLabel}</span>
          )}
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>{product.name}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{product.description}</p>

        {business && (
          <Card>
            <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
              <Store className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <Link href={routes.MARKETPLACE_BUSINESS(business.brandId)} className="hover:underline">
                {business.businessName}
              </Link>
            </h3>
            <p className="mt-2 mb-2 fb-hint">Contact the seller directly about this item.</p>
            <ContactLinks business={business} />
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

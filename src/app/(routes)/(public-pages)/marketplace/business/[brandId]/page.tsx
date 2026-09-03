"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, Store } from "lucide-react";
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
import { BusinessDetailResponse } from "@/types";
import { useBusinessRatings } from "@/hooks/use-business-ratings";

// RESTYLE + rename (design/DECISIONS.md §Marketplace) — see the browse
// page's note on the "Brands" rename. Fetch unchanged.
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

  return <BusinessDetailContent business={business} products={products} brandId={brandId} />;
}

function BusinessDetailContent({
  business,
  products,
  brandId,
}: {
  business: BusinessDetailResponse["business"];
  products: BusinessDetailResponse["products"];
  brandId: string;
}) {
  // From the B2B marketplace's rating exchange (2026-09-02) — public, no
  // auth required. Only surfaced when there's at least one rating, since
  // most businesses won't have any yet.
  const { data: ratings } = useBusinessRatings(brandId);

  return (
    <MainLayout maxWidth="4xl">
      <Link href={routes.MARKETPLACE}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Button>
      </Link>

      <div className="space-y-4">
        {business.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.coverImageUrl}
            alt=""
            className="w-full aspect-[3/1] object-cover rounded-lg"
            style={{ border: "1px solid var(--line)" }}
          />
        )}

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
            ) : (
              <Store className="h-7 w-7" style={{ color: "var(--faint)" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>{business.businessName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {business.category?.map((c) => (
                <Pill key={c}><span style={{ textTransform: "capitalize" }}>{c}</span></Pill>
              ))}
              {(business.city || business.state || business.country) && (
                <span className="fb-hint flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[business.city, business.state, business.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {business.businessDescription && (
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{business.businessDescription}</p>
        )}

        <ContactLinks business={business} />

        {ratings && ratings.count > 0 && (
          <Card tight className="p-3.5 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4"
                  style={{
                    color: i < Math.round(ratings.averageScore) ? "var(--free)" : "var(--faint)",
                    fill: i < Math.round(ratings.averageScore) ? "var(--free)" : "none",
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 13, color: "var(--txt)" }}>
              {ratings.averageScore.toFixed(1)} from {ratings.count} B2B rating{ratings.count !== 1 ? "s" : ""}
            </span>
          </Card>
        )}

        {products.length > 0 && (
          <div>
            <h2 className="mb-2" style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--txt)" }}>Products &amp; services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Link key={product._id} href={routes.MARKETPLACE_PRODUCT(product._id)}>
                  <Card tight className="h-full transition-colors hover:border-[var(--accent)]">
                    <div className="aspect-video flex items-center justify-center" style={{ background: "var(--ink-900)" }}>
                      {product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6" style={{ color: "var(--faint)" }} />
                      )}
                    </div>
                    <div className="p-3.5">
                      <h3 style={{ fontFamily: "var(--display)", fontSize: 14, color: "var(--txt)" }}>{product.name}</h3>
                      {product.priceLabel && <p className="mt-0.5" style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>{product.priceLabel}</p>}
                      <p className="mt-1.5 line-clamp-2" style={{ fontSize: 12.5, color: "var(--muted)" }}>{product.description}</p>
                    </div>
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

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { Plus, Package, Tag, ImageOff } from "lucide-react";
import { userAtom } from "@/atom/user";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { Button } from "@/components/ui/freebiz-button";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { MarketplaceProduct, MarketplaceProductsResponse } from "@/types";

// RESTYLE (design/DECISIONS.md §Marketplace) — showcase products on the
// brand's directory listing. Fetch unchanged.
export default function BrandProductsPage() {
  const user = useAtomValue(userAtom);

  const { data: myProducts, isLoading, error } = useQuery<MarketplaceProduct[]>({
    queryKey: ["marketplace-products-mine"],
    queryFn: () =>
      api.get<MarketplaceProductsResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS_MINE).then((res) => res.data.products),
    enabled: !!user?.accessToken,
  });

  if (isLoading) return <PageLoader withLayout={false} message="Loading products..." />;
  if (error) {
    return (
      <PageError withLayout={false} title="Failed to Load Products" message="Unable to load your product listings. Please try again." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Showcase products
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Products &amp; services shown on your directory listing — no prices are charged in-app.
          </p>
        </div>
        <Link href={routes.BRAND.PRODUCTS_NEW}>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      {(!myProducts || myProducts.length === 0) ? (
        <Card>
          <div className="text-center py-8">
            <Package className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>Showcase your first product or service on your directory listing.</CardNote>
            <Link href={routes.BRAND.PRODUCTS_NEW} className="inline-block mt-3">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                New product
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myProducts.map((product) => (
            <Card key={product._id} tight>
              <div className="aspect-video flex items-center justify-center" style={{ background: "var(--ink-900)" }}>
                {product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="h-8 w-8" style={{ color: "var(--faint)" }} />
                )}
              </div>
              <div className="p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Pill><Tag className="h-3 w-3" /><span style={{ textTransform: "capitalize" }}>{product.category}</span></Pill>
                  {!product.isActive && <Pill tone="default">Inactive</Pill>}
                </div>
                <h3 className="mt-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>{product.name}</h3>
                {product.priceLabel && (
                  <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>{product.priceLabel}</p>
                )}
                <p className="mt-1.5 line-clamp-3" style={{ fontSize: 12.5, color: "var(--muted)" }}>{product.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

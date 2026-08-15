"use client";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { Plus, Package, Tag, ImageOff } from "lucide-react";
import { userAtom } from "@/atom/user";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { MarketplaceProduct, MarketplaceProductsResponse } from "@/types";

export default function BrandProductsPage() {
  const user = useAtomValue(userAtom);

  const { data: myProducts, isLoading, error } = useQuery<MarketplaceProduct[]>({
    queryKey: ["marketplace-products-mine"],
    queryFn: () =>
      api.get<MarketplaceProductsResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS_MINE).then((res) => res.data.products),
    enabled: !!user?.accessToken,
  });

  if (isLoading) return <PageLoader message="Loading products..." />;
  if (error) {
    return (
      <PageError title="Failed to Load Products" message="Unable to load your product listings. Please try again." />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">Showcase Products</h1>
          <p className="text-muted-foreground">
            Products &amp; services shown on your directory listing — no prices are charged in-app.
          </p>
        </div>
        <Link href={routes.BRAND.PRODUCTS_NEW}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(myProducts ?? []).map((product) => (
          <Card key={product._id} className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
            <div className="aspect-video bg-white/5 flex items-center justify-center">
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </Badge>
                {!product.isActive && <Badge variant="outline">Inactive</Badge>}
              </div>
              <CardTitle className="text-foreground font-sora text-lg mt-2">{product.name}</CardTitle>
              {product.priceLabel && (
                <p className="text-primary font-semibold text-sm">{product.priceLabel}</p>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!myProducts || myProducts.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-6">Showcase your first product or service on your directory listing</p>
          <Link href={routes.BRAND.PRODUCTS_NEW}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { Plus, Package, Tag } from "lucide-react";
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

  // No brand-scoped "my products" endpoint exists in the API contract (§7
  // only documents public GET /marketplace/products) — filter the public
  // list client-side by brandId until one exists.
  const { data: allProducts, isLoading, error } = useQuery<MarketplaceProduct[]>({
    queryKey: ["marketplace-products"],
    queryFn: () =>
      api.get<MarketplaceProductsResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS).then((res) => res.data.products),
  });

  const myProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.brandId === user?.id),
    [allProducts, user?.id]
  );

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
          <h1 className="text-3xl font-bold text-foreground font-sora">Digital Products</h1>
          <p className="text-muted-foreground">Manage your marketplace listings</p>
        </div>
        <Link href={routes.BRAND.PRODUCTS_NEW}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myProducts.map((product) => (
          <Card key={product._id} className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </Badge>
                <span className="text-primary font-bold font-sora">${product.priceUSD}</span>
              </div>
              <CardTitle className="text-foreground font-sora text-lg mt-2">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {myProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-6">List your first digital product on the marketplace</p>
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

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Tag, ShoppingBag } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { MarketplaceProduct, MarketplaceProductsResponse } from "@/types";

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  const { data: products, isLoading, error } = useQuery<MarketplaceProduct[]>({
    queryKey: ["marketplace-products"],
    queryFn: () =>
      api.get<MarketplaceProductsResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS).then((res) => res.data.products),
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((products ?? []).map((p) => p.category)))],
    [products]
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = category === "all" || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, category]);

  if (isLoading) return <PageLoader message="Loading marketplace..." />;
  if (error) {
    return <PageError title="Failed to Load Marketplace" message="Unable to load products. Please try again." />;
  }

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            Spend cash or discount codes earned from spins and referrals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-all ${
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-border"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <Link key={product._id} href={routes.MARKETPLACE_PRODUCT(product._id)}>
              <Card className="bg-card/50 backdrop-blur-sm border-border h-full hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="flex items-center gap-1 capitalize">
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
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No products found.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

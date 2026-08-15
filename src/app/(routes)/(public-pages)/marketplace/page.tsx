"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Tag, Store, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { BusinessDirectoryResponse, BusinessProfile } from "@/types";

const PAGE_SIZE = 50;

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: businesses, isLoading, error } = useQuery<BusinessProfile[]>({
    queryKey: ["marketplace-businesses", searchQuery, limit],
    queryFn: () =>
      api
        .get<BusinessDirectoryResponse>(
          `${ENDPOINTS.MARKETPLACE_BUSINESSES}?limit=${limit}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`
        )
        .then((res) => res.data.businesses),
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((businesses ?? []).flatMap((b) => b.category)))],
    [businesses]
  );

  const filtered = useMemo(() => {
    if (!businesses) return [];
    if (category === "all") return businesses;
    return businesses.filter((b) => b.category.includes(category));
  }, [businesses, category]);

  if (isLoading) return <PageLoader message="Loading marketplace..." />;
  if (error) {
    return <PageError title="Failed to Load Marketplace" message="Unable to load businesses. Please try again." />;
  }

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            Browse businesses and reach out directly — no checkout, no prices paid in-app.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
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
          {filtered.map((business) => (
            <Link key={business.brandId} href={routes.MARKETPLACE_BUSINESS(business.brandId)}>
              <Card className="bg-card/50 backdrop-blur-sm border-border h-full hover:border-primary/50 transition-colors overflow-hidden">
                <div className="aspect-video bg-white/5 flex items-center justify-center">
                  {business.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  {business.category?.[0] && (
                    <Badge variant="secondary" className="flex items-center gap-1 capitalize w-fit">
                      <Tag className="h-3 w-3" />
                      {business.category[0]}
                    </Badge>
                  )}
                  <CardTitle className="text-foreground font-sora text-lg mt-2">{business.businessName}</CardTitle>
                </CardHeader>
                <CardContent>
                  {business.businessDescription && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{business.businessDescription}</p>
                  )}
                  {(business.city || business.state) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[business.city, business.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No businesses found.</p>
          </div>
        )}

        {businesses && businesses.length >= limit && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

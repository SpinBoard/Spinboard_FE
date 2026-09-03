"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Tag, Store, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Card } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { BusinessDirectoryResponse, BusinessProfile } from "@/types";

const PAGE_SIZE = 50;

// RESTYLE + rename (design/DECISIONS.md §Marketplace business decision) —
// this business directory is being un-parked and renamed "Brands"; the
// word "Marketplace" now belongs only to the not-yet-built redemption
// catalog (v-market), so it's dropped everywhere on this route family to
// avoid two different things sharing one name. No mockup screen exists for
// this, so the layout stays as it was — only tokens/primitives and the
// "Brands" naming change here. Every fetch is unchanged.
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

  if (isLoading) return <PageLoader message="Loading brands..." />;
  if (error) {
    return <PageError title="Failed to Load Brands" message="Unable to load businesses. Please try again." />;
  }

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-4">
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Brands
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Browse businesses and reach out directly — no checkout, no prices paid in-app.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Field label="Search" className="flex-1 max-w-md">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--faint)" }} />
              <Input
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
          </Field>
          <div className="flex flex-wrap gap-2 sm:mt-6">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`fb-pill${category === c ? " fb-pill--live" : ""}`}
                style={{ cursor: "pointer", textTransform: "capitalize" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((business) => (
            <Link key={business.brandId} href={routes.MARKETPLACE_BUSINESS(business.brandId)}>
              <Card tight className="h-full transition-colors hover:border-[var(--accent)]">
                <div className="aspect-video flex items-center justify-center" style={{ background: "var(--ink-900)" }}>
                  {business.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.logoUrl} alt={business.businessName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8" style={{ color: "var(--faint)" }} />
                  )}
                </div>
                <div className="p-3.5">
                  {business.category?.[0] && (
                    <Pill className="mb-2">
                      <Tag className="h-3 w-3" />
                      <span style={{ textTransform: "capitalize" }}>{business.category[0]}</span>
                    </Pill>
                  )}
                  <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>{business.businessName}</h3>
                  {business.businessDescription && (
                    <p className="mt-1.5 line-clamp-2" style={{ fontSize: 13, color: "var(--muted)" }}>{business.businessDescription}</p>
                  )}
                  {(business.city || business.state) && (
                    <p className="mt-1.5 fb-hint flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[business.city, business.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Store className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <p style={{ color: "var(--muted)" }}>No businesses found.</p>
          </div>
        )}

        {businesses && businesses.length >= limit && (
          <div className="text-center">
            <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

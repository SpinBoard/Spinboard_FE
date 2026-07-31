"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, Download, FileText } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { MarketplaceOrder, MarketplaceOrdersResponse } from "@/types";

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useQuery<MarketplaceOrder[]>({
    queryKey: ["marketplace-orders-mine"],
    queryFn: () =>
      api.get<MarketplaceOrdersResponse>(ENDPOINTS.MARKETPLACE_ORDERS_MINE).then((res) => res.data.orders),
  });

  if (isLoading) return <PageLoader message="Loading your orders..." />;
  if (error) {
    return <PageError title="Failed to Load Orders" message="Unable to load your purchase history. Please try again." />;
  }

  return (
    <MainLayout maxWidth="3xl">
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">Your Orders</h1>
          <p className="text-muted-foreground text-sm">Purchase history and digital deliveries.</p>
        </div>

        <div className="space-y-4">
          {(orders ?? []).map((order) => (
            <Card key={order._id} className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground font-sora text-lg">{order.productName}</CardTitle>
                  <Badge className={order.deliveredAt ? "bg-success/20 text-success border-success/30" : "bg-white/10 text-muted-foreground"}>
                    {order.deliveredAt ? "Delivered" : "Pending"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Reference</span>
                  <span className="text-foreground font-mono text-xs">{order.reference}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Amount paid</span>
                  <span className="text-foreground">${order.amountPaid}</span>
                </div>
                {order.discountCode && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount code</span>
                    <span className="text-foreground">{order.discountCode}</span>
                  </div>
                )}
                {order.deliveryPayload?.deliveryAsset && (
                  <a
                    href={order.deliveryPayload.deliveryAsset}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-secondary hover:underline pt-2 border-t border-border">
                    <Download className="h-4 w-4" />
                    Download / access link
                  </a>
                )}
                {order.deliveryPayload?.fulfillmentInstructions && (
                  <p className="text-sm text-muted-foreground pt-2 border-t border-border flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {order.deliveryPayload.fulfillmentInstructions}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {(!orders || orders.length === 0) && (
          <div className="text-center py-16">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No orders yet.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

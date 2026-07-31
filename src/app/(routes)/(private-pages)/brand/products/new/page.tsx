"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { MarketplaceProductResponse } from "@/types";

// §7: at least one of deliveryAsset (link) or fulfillmentInstructions is required.
const productSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    priceUSD: z.number().positive("Enter a price greater than 0"),
    category: z.string().min(2, "Category is required"),
    deliveryAsset: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    fulfillmentInstructions: z.string().optional().or(z.literal("")),
  })
  .refine((data) => !!data.deliveryAsset?.trim() || !!data.fulfillmentInstructions?.trim(), {
    message: "Provide a delivery link or fulfillment instructions",
    path: ["deliveryAsset"],
  });

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      priceUSD: 0,
      category: "",
      deliveryAsset: "",
      fulfillmentInstructions: "",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (payload: ProductFormValues) =>
      api.post<MarketplaceProductResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS, payload),
    onSuccess: () => {
      toast.success("Product listed successfully!");
      router.push(routes.BRAND.PRODUCTS);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to create product");
    },
  });

  const onSubmit = (values: ProductFormValues) => createProductMutation.mutate(values);

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={routes.BRAND.PRODUCTS}>
          <Button variant="outline" size="icon" className="border-border text-foreground hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">New Digital Product</h1>
          <p className="text-muted-foreground">List a digital product on the marketplace</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora flex items-center gap-2">
            <Package className="h-5 w-5 text-secondary" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Premium eBook Bundle" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px]" placeholder="Describe your product..." {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priceUSD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ebooks" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="deliveryAsset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Delivery link <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fulfillmentInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fulfillment instructions{" "}
                      <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. License key emailed within 24 hours" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "List Product"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

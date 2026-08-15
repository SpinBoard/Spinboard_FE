"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, Upload, X } from "lucide-react";
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
import { apiErrorMessage } from "@/app/_utils/helper";
import { MarketplaceProductResponse } from "@/types";

const MAX_IMAGES = 6;

// No price/checkout fields anymore — priceLabel is optional free-form
// display text ("From ₦5,000", "Contact for quote"), never a charged amount.
const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(2, "Category is required"),
  priceLabel: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      priceLabel: "",
    },
  });

  const handleImagesChange = (files: FileList | null) => {
    if (!files) return;
    const next = [...images, ...Array.from(files)].slice(0, MAX_IMAGES);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const createProductMutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("description", values.description);
      formData.append("category", values.category);
      if (values.priceLabel?.trim()) formData.append("priceLabel", values.priceLabel.trim());
      images.forEach((file) => formData.append("images", file));
      return api.post<MarketplaceProductResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Product listed successfully!");
      router.push(routes.BRAND.PRODUCTS);
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Failed to create product"));
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
          <h1 className="text-3xl font-bold text-foreground font-sora">New Showcase Product</h1>
          <p className="text-muted-foreground">Add a product or service to your directory listing</p>
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
                      <Input placeholder="e.g. Oak Dining Table" {...field} />
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
                      <Textarea className="min-h-[100px]" placeholder="Describe your product or service..." {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Furniture" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Price label <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. From ₦5,000" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Photos <span className="text-muted-foreground text-xs font-normal">(up to {MAX_IMAGES}, optional)</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-white/30">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleImagesChange(e.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>

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

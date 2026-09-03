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
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
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

// RESTYLE (design/DECISIONS.md §Marketplace) — add a showcase product to
// the brand's directory listing. Fetch/schema unchanged.
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
  const errors = form.formState.errors;

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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={routes.BRAND.PRODUCTS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>
            New showcase product
          </h1>
          <p className="fb-hint mt-0.5">Add a product or service to your directory listing</p>
        </div>
      </div>

      <Card>
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
          <Package className="h-4 w-4" style={{ color: "var(--accent)" }} />
          Product details
        </h3>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <Field label="Name" htmlFor="name">
            <Input id="name" placeholder="e.g. Oak Dining Table" {...form.register("name")} />
            {errors.name && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.name.message}</span>}
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea id="description" rows={4} placeholder="Describe your product or service..." {...form.register("description")} />
            {errors.description && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.description.message}</span>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="category">
              <Input id="category" placeholder="e.g. Furniture" {...form.register("category")} />
              {errors.category && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.category.message}</span>}
            </Field>
            <Field label="Price label (optional)" htmlFor="priceLabel">
              <Input id="priceLabel" placeholder="e.g. From ₦5,000" {...form.register("priceLabel")} />
            </Field>
          </div>

          <Field label={`Photos (up to ${MAX_IMAGES}, optional)`}>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 rounded-full p-0.5"
                    style={{ background: "rgba(0,0,0,.6)" }}>
                    <X className="h-3 w-3" style={{ color: "var(--txt)" }} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer" style={{ border: "2px dashed var(--line-2)" }}>
                  <Upload className="h-5 w-5" style={{ color: "var(--faint)" }} />
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
          </Field>

          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createProductMutation.isPending}>
            {createProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "List product"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { apiErrorMessage } from "@/app/_utils/helper";
import { BusinessProfile, BusinessProfileResponse, BusinessSocialLinks } from "@/types";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, Save, Loader2, Package, Globe } from "lucide-react";

const SOCIAL_FIELDS: (keyof BusinessSocialLinks)[] = [
  "website",
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "linkedin",
  "youtube",
];

const emptyForm = {
  businessName: "",
  businessDescription: "",
  contactEmail: "",
  contactPhone: "",
  whatsappNumber: "",
  address: "",
  socialLinks: {} as BusinessSocialLinks,
  isListed: false,
};

export default function BusinessProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const { data: profile, isLoading } = useQuery<BusinessProfile>({
    queryKey: ["business-profile-mine"],
    queryFn: () =>
      api
        .get<BusinessProfileResponse>(ENDPOINTS.MARKETPLACE_BUSINESS_PROFILE_MINE)
        .then((res) => res.data.profile),
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      businessName: profile.businessName ?? "",
      businessDescription: profile.businessDescription ?? "",
      contactEmail: profile.contactEmail ?? "",
      contactPhone: profile.contactPhone ?? "",
      whatsappNumber: profile.whatsappNumber ?? "",
      address: profile.address ?? "",
      socialLinks: profile.socialLinks ?? {},
      isListed: profile.isListed,
    });
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("businessName", form.businessName);
      formData.append("businessDescription", form.businessDescription);
      formData.append("contactEmail", form.contactEmail);
      formData.append("contactPhone", form.contactPhone);
      formData.append("whatsappNumber", form.whatsappNumber);
      formData.append("address", form.address);
      formData.append("isListed", String(form.isListed));
      formData.append("socialLinks", JSON.stringify(form.socialLinks));
      if (logoFile) formData.append("logo", logoFile);
      if (coverFile) formData.append("coverImage", coverFile);
      return api.put<BusinessProfileResponse>(ENDPOINTS.MARKETPLACE_BUSINESS_PROFILE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-profile-mine"] });
      toast.success("Directory listing saved.");
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Couldn't save your listing. Please try again."));
    },
  });

  if (isLoading) return <PageLoader message="Loading your directory listing..." />;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Mirrors the backend's publish gate (name + at least one contact method,
  // checked against the merged current+request state) so a brand can fill
  // in the missing fields and flip the toggle in the same save.
  const canPublish =
    !!form.businessName.trim() &&
    (!!form.contactEmail.trim() || !!form.contactPhone.trim() || !!form.whatsappNumber.trim());

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora flex items-center gap-3">
            <Store className="h-7 w-7 text-secondary" />
            Marketplace Listing
          </h1>
          <p className="text-muted-foreground">
            A public business-directory profile — no checkout, no prices charged in-app. Users browse and
            contact you directly.
          </p>
        </div>
        <Link href={routes.BRAND.PRODUCTS}>
          <Button variant="outline" className="border-border text-foreground hover:bg-white/10">
            <Package className="h-4 w-4 mr-2" />
            Manage Products
          </Button>
        </Link>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora text-lg">Business profile</CardTitle>
          <CardDescription>This is what shows on your public directory page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="e.g. Naija Snacks Co."
            />
          </div>

          {profile?.category && profile.category.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Listed under: {profile.category.join(", ")} — categories come from your{" "}
              <Link href={routes.BRAND.PROFILE} className="text-secondary hover:underline">
                business categories on your brand profile
              </Link>
              .
            </p>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              className="min-h-[100px]"
              value={form.businessDescription}
              onChange={(e) => update("businessDescription", e.target.value)}
              placeholder="What do you offer?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp number</Label>
              <Input value={form.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
            {(profile?.country || profile?.state || profile?.city) && (
              <p className="text-xs text-muted-foreground">
                {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ")} — country/state/city
                come from your{" "}
                <Link href={routes.BRAND.PROFILE} className="text-secondary hover:underline">
                  brand profile
                </Link>
                .
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Social links
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SOCIAL_FIELDS.map((field) => (
                <Input
                  key={field}
                  placeholder={field}
                  value={form.socialLinks[field] ?? ""}
                  onChange={(e) =>
                    update("socialLinks", { ...form.socialLinks, [field]: e.target.value })
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Checkbox
              id="isListed"
              checked={form.isListed}
              disabled={!canPublish && !form.isListed}
              onCheckedChange={(checked) => update("isListed", checked === true)}
            />
            <div>
              <Label htmlFor="isListed">Publish to the public directory</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canPublish || form.isListed
                  ? "Visible to everyone browsing the marketplace directory."
                  : "Add a business name and at least one contact method (email, phone, or WhatsApp) before you can publish."}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save listing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

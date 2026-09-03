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
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Toggle } from "@/components/settings/notif-toggle";
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

// RESTYLE + rename (design/DECISIONS.md §Marketplace) — this is the brand's
// own directory-listing management, un-parked alongside the viewer-facing
// "Brands" browse page. Kept as "Directory listing" here rather than
// "Brands" too — see nav-config.tsx's note on why the two labels differ.
// Fetch/mutation unchanged.
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

  if (isLoading) return <PageLoader withLayout={false} message="Loading your directory listing..." />;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Mirrors the backend's publish gate (name + at least one contact method,
  // checked against the merged current+request state) so a brand can fill
  // in the missing fields and flip the toggle in the same save.
  const canPublish =
    !!form.businessName.trim() &&
    (!!form.contactEmail.trim() || !!form.contactPhone.trim() || !!form.whatsappNumber.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            <Store className="h-6 w-6" style={{ color: "var(--accent)" }} />
            Directory listing
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            A public business-directory profile — no checkout, no prices charged in-app. Users
            browse and contact you directly.
          </p>
        </div>
        <Link href={routes.BRAND.PRODUCTS}>
          <Button variant="ghost">
            <Package className="h-4 w-4" />
            Manage products
          </Button>
        </Link>
      </div>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Business profile</h3>
        <p className="fb-hint mt-1">This is what shows on your public directory page.</p>

        <div className="mt-4 space-y-3">
          <Field label="Business name">
            <Input
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              placeholder="e.g. Naija Snacks Co."
            />
          </Field>

          {profile?.category && profile.category.length > 0 && (
            <p className="fb-hint">
              Listed under: {profile.category.join(", ")} — categories come from your{" "}
              <Link href={routes.BRAND.PROFILE} style={{ color: "var(--accent)" }}>
                business categories on your brand profile
              </Link>
              .
            </p>
          )}

          <Field label="Description">
            <Textarea
              rows={4}
              value={form.businessDescription}
              onChange={(e) => update("businessDescription", e.target.value)}
              placeholder="What do you offer?"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Logo">
              <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Cover image">
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Contact email">
              <Input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
            </Field>
            <Field label="WhatsApp number">
              <Input value={form.whatsappNumber} onChange={(e) => update("whatsappNumber", e.target.value)} />
            </Field>
          </div>

          <Field label="Address">
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
            {(profile?.country || profile?.state || profile?.city) && (
              <span className="fb-hint mt-1">
                {[profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ")} — country/state/city
                come from your{" "}
                <Link href={routes.BRAND.PROFILE} style={{ color: "var(--accent)" }}>
                  brand profile
                </Link>
                .
              </span>
            )}
          </Field>

          <div>
            <p className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              <Globe className="h-3.5 w-3.5" />
              Social links
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

          <div className="flex items-start justify-between gap-3 rounded-lg p-3" style={{ border: "1px solid var(--line)" }}>
            <div>
              <p style={{ fontSize: 13, color: "var(--txt)" }}>Publish to the public directory</p>
              <p className="fb-hint mt-0.5">
                {canPublish || form.isListed
                  ? "Visible to everyone browsing the Brands directory."
                  : "Add a business name and at least one contact method (email, phone, or WhatsApp) before you can publish."}
              </p>
            </div>
            <Toggle
              checked={form.isListed}
              disabled={!canPublish && !form.isListed}
              onChange={(checked) => update("isListed", checked)}
            />
          </div>

          <div className="pt-3" style={{ borderTop: "1px solid var(--line)" }}>
            <Button variant="primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save listing
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

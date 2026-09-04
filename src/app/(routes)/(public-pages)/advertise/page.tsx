"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle, Upload, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { routes } from "@/app/_utils/routes";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useSubmitSponsoredAd } from "@/hooks/use-sponsored-ads";

// New 2026-09-04 — public submission form for the admin-curated
// sponsored-ad panel (see admin/sponsored-ads/page.tsx). No account
// required — any advertiser, on the platform or not
// (POST /sponsored-ads/submit). Lands PENDING and stays invisible on the
// billboard until an admin reviews it and activates or declines it; this
// is deliberately just a "thanks, we'll be in touch" confirmation, not a
// tracked submission a visitor can check the status of later.
export default function AdvertisePage() {
  const submitAd = useSubmitSponsoredAd();

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [advertiserName, setAdvertiserName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleImageChange = (file: File | null) => {
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !advertiserName.trim() || !contactEmail.trim()) {
      toast.error("An image, your business name, and a contact email are required.");
      return;
    }
    submitAd.mutate(
      {
        image,
        advertiserName: advertiserName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        message: message.trim() || undefined,
        clickUrl: clickUrl.trim() || undefined,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't submit your ad. Please try again.")),
      }
    );
  };

  if (submitted) {
    return (
      <MainLayout maxWidth="sm">
        <Card>
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--live)" }} />
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20, color: "var(--txt)" }}>
              Thanks — we&apos;ll be in touch
            </h1>
            <p className="mt-2" style={{ fontSize: 13.5, color: "var(--muted)" }}>
              Our team will review your submission and reach out to the contact email you provided
              to finalize details before it goes live.
            </p>
            <Link href={routes.WATCH} className="inline-block mt-4">
              <Button variant="primary">Back to the billboard</Button>
            </Link>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout maxWidth="sm">
      <div className="mb-4">
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Advertise on Freebiz
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          A small, persistent placement next to the billboard. Send us your creative and contact
          details — we&apos;ll follow up to work out the rest.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Creative (image or GIF, no video/audio)">
            <label className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer" style={{ border: "1px dashed var(--line-2)" }}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="w-14 h-14 object-cover rounded" />
              ) : (
                <Upload className="h-4 w-4 flex-shrink-0" style={{ color: "var(--faint)" }} />
              )}
              <span className="fb-hint truncate">{image?.name ?? "Choose a file"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
          <Field label="Business / advertiser name" htmlFor="advertiserName">
            <Input id="advertiserName" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} required />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail" hint="How we'll reach you to finalize details.">
            <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
          </Field>
          <Field label="Contact phone (optional)" htmlFor="contactPhone">
            <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </Field>
          <Field label="Click-through URL (optional)" htmlFor="clickUrl">
            <Input id="clickUrl" type="url" placeholder="https://..." value={clickUrl} onChange={(e) => setClickUrl(e.target.value)} />
          </Field>
          <Field label="Anything else? (optional)" htmlFor="message">
            <Textarea id="message" rows={3} placeholder="Budget, timing, target audience..." value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>

          <Button type="submit" variant="primary" className="w-full justify-center" disabled={submitAd.isPending}>
            {submitAd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </Button>
          <CardNote>Nothing goes live automatically — every submission is reviewed by our team first.</CardNote>
        </form>
      </Card>
    </MainLayout>
  );
}

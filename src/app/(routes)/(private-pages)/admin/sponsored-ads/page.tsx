"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Upload, Power, PowerOff, MousePointerClick, Inbox, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { apiErrorMessage } from "@/app/_utils/helper";
import { routes } from "@/app/_utils/routes";
import {
  useAdminSponsoredAds,
  useCreateSponsoredAd,
  useActivateSponsoredAd,
  useDeactivateSponsoredAd,
} from "@/hooks/use-sponsored-ads";

// New 2026-09-03, extended 2026-09-04 — a small, deliberately minimal
// side-panel placement on the billboard, entirely separate from brand
// self-serve AdCampaign banners. Two ways an ad gets here: an admin
// negotiates off-platform and uploads the already-agreed creative directly
// (goes live immediately — the upload itself is the vetting step), or an
// advertiser submits their own via the public /advertise form, which lands
// PENDING here for review — the same activate/deactivate actions approve
// or decline it.
export default function AdminSponsoredAdsPage() {
  const { data: ads, isLoading, error } = useAdminSponsoredAds();
  const createAd = useCreateSponsoredAd();
  const activateAd = useActivateSponsoredAd();
  const deactivateAd = useDeactivateSponsoredAd();

  const pendingAds = ads?.filter((a) => a.status === "PENDING") ?? [];
  const otherAds = ads?.filter((a) => a.status !== "PENDING") ?? [];

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [advertiserName, setAdvertiserName] = useState("");
  const [clickUrl, setClickUrl] = useState("");

  const handleImageChange = (file: File | null) => {
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !advertiserName.trim()) {
      toast.error("An image and advertiser name are required.");
      return;
    }
    createAd.mutate(
      { image, advertiserName: advertiserName.trim(), clickUrl: clickUrl.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Live on the billboard's sponsored-ad panel.");
          setImage(null);
          setPreview(null);
          setAdvertiserName("");
          setClickUrl("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't upload this ad.")),
      }
    );
  };

  if (isLoading) return <PageLoader withLayout={false} message="Loading sponsored ads..." />;
  if (error) return <Card><CardNote>Failed to load sponsored ads. Please try again.</CardNote></Card>;

  const activeAd = ads?.find((a) => a.status === "ACTIVE");

  return (
    <div className="space-y-4">
      <div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Admin / Sponsored ads
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Sponsored ads
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          A small side panel next to the billboard. Upload creative you&apos;ve already negotiated
          off-platform to go live immediately, or review what advertisers have submitted themselves
          via the <a href={routes.ADVERTISE} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>public form</a>.
        </p>
      </div>

      {pendingAds.length > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" style={{ color: "var(--free)" }} />
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Pending review</h3>
            <Pill tone="warn" dot>{pendingAds.length}</Pill>
          </div>
          <div className="mt-3 space-y-3">
            {pendingAds.map((ad) => (
              <div key={ad._id} className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.advertiserName} className="w-full sm:w-28 h-28 object-cover rounded-lg flex-shrink-0" style={{ border: "1px solid var(--line)" }} />
                <div className="flex-1 min-w-0">
                  <b style={{ fontSize: 13.5, color: "var(--txt)" }}>{ad.advertiserName}</b>
                  {ad.contactEmail && <p className="fb-hint mt-0.5">{ad.contactEmail}{ad.contactPhone ? ` · ${ad.contactPhone}` : ""}</p>}
                  {ad.clickUrl && <p className="fb-hint mt-0.5 truncate">{ad.clickUrl}</p>}
                  {ad.message && <p className="mt-1.5" style={{ fontSize: 13, color: "var(--muted)" }}>{ad.message}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="primary" disabled={activateAd.isPending} onClick={() => activateAd.mutate(ad._id, { onSuccess: () => toast.success("Approved — live on the billboard."), onError: (err) => toast.error(apiErrorMessage(err, "Couldn't approve this submission.")) })}>
                      {activateAd.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" disabled={deactivateAd.isPending} onClick={() => deactivateAd.mutate(ad._id, { onSuccess: () => toast.success("Declined."), onError: (err) => toast.error(apiErrorMessage(err, "Couldn't decline this submission.")) })}>
                      {deactivateAd.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-4 w-4" style={{ color: "var(--accent)" }} />
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Currently live</h3>
        </div>
        {activeAd ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeAd.imageUrl} alt={activeAd.advertiserName} className="w-20 h-20 object-cover rounded-lg" style={{ border: "1px solid var(--line)" }} />
            <div>
              <b style={{ fontSize: 13.5, color: "var(--txt)" }}>{activeAd.advertiserName}</b>
              <p className="fb-hint mt-0.5">{activeAd.clickCount} click{activeAd.clickCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
        ) : (
          <CardNote className="mt-2">Nothing live — the panel shows a placeholder on the billboard right now.</CardNote>
        )}
      </Card>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Upload a new ad</h3>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <Field label="Creative (image or GIF, no video/audio)">
            <label className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer" style={{ border: "1px dashed var(--line-2)" }}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="w-14 h-14 object-cover rounded" />
              ) : (
                <Upload className="h-4 w-4 flex-shrink-0" style={{ color: "var(--faint)" }} />
              )}
              <span className="fb-hint truncate">{image?.name ?? "Choose a file"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          <Field label="Advertiser name" htmlFor="advertiserName">
            <Input id="advertiserName" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} required />
          </Field>
          <Field label="Click-through URL (optional)" htmlFor="clickUrl">
            <Input id="clickUrl" type="url" placeholder="https://..." value={clickUrl} onChange={(e) => setClickUrl(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={createAd.isPending}>
            {createAd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload and go live"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Admin uploads &amp; decided submissions</h3>
        {otherAds.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>Nothing uploaded yet.</CardNote>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherAds.map((ad) => (
              <div key={ad._id} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                <div className="aspect-video flex items-center justify-center" style={{ background: "var(--ink-900)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.imageUrl} alt={ad.advertiserName} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <b style={{ fontSize: 13, color: "var(--txt)" }} className="truncate">{ad.advertiserName}</b>
                    <Pill tone={ad.status === "ACTIVE" ? "live" : "default"} dot={ad.status === "ACTIVE"}>{ad.status}</Pill>
                  </div>
                  <p className="fb-hint mt-1">{ad.clickCount} click{ad.clickCount !== 1 ? "s" : ""}</p>
                  <div className="mt-2">
                    {ad.status === "ACTIVE" ? (
                      <Button size="sm" variant="ghost" disabled={deactivateAd.isPending} onClick={() => deactivateAd.mutate(ad._id, { onError: (err) => toast.error(apiErrorMessage(err, "Couldn't deactivate this ad.")) })}>
                        <PowerOff className="h-3.5 w-3.5" /> Deactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary" disabled={activateAd.isPending} onClick={() => activateAd.mutate(ad._id, { onError: (err) => toast.error(apiErrorMessage(err, "Couldn't activate this ad.")) })}>
                        <Power className="h-3.5 w-3.5" /> Activate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

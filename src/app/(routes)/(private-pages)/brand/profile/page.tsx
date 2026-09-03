"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import {
  Building2,
  Camera,
  Save,
  Edit,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { useAtom } from "jotai";
import { userAtom } from "@/atom/user";
import { useBrandProfile } from "@/hooks/use-brand-profile";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { BrandProfileData } from "@/types";
import { toast } from "sonner";

// RESTYLE (design/DECISIONS.md #20) — the mockup has no screen for this
// route, so the layout stays as it is; only tokens/primitives/copy tone
// change. DECISIONS.md's original note that this screen is for "company
// details, logo, RC number" was aspirational at the time — registrationNumber
// is now real (§2 Revamp 6, settable via PUT /profile/brand) and restored
// as an editable field. strikeCount/suspended/suspendedReason are also new
// on brandDetails but are read-only admin-driven state, shown as a banner
// rather than a form field.
export default function BrandProfilePage() {
  const [user, setUser] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const { data: profile, error: profileError, isLoading: loadingProfile } = useBrandProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessCategories, setBusinessCategories] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setCompanyName(profile.companyName || "");
    setBusinessCategories(profile.brandDetails?.businessCategories || []);
    setCountry(profile.brandDetails?.country || "");
    setState(profile.brandDetails?.state || "");
    setCity(profile.brandDetails?.city || "");
    setRegistrationNumber(profile.brandDetails?.registrationNumber || "");
    setAvatarPreview(profile.avatar || "");
  }, [profile]);

  const buildFormData = (fields: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    return formData;
  };

  const updateProfileMutation = useMutation({
    mutationFn: (fields: Record<string, string>) =>
      api.put<{ profile: BrandProfileData }>(ENDPOINTS.BRAND_PROFILE, buildFormData(fields), {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (response) => {
      const updated = response.data.profile;
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
      if (user) {
        setUser({
          ...user,
          fullName: updated.name,
          companyName: updated.companyName,
          profileComplete: updated.brandDetails?.profileComplete,
        });
      }
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to update profile. Please try again.");
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return api.put<{ profile: BrandProfileData }>(ENDPOINTS.BRAND_PROFILE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (response) => {
      const updated = response.data.profile;
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
      toast.success("Logo updated successfully!");
      if (user) setUser({ ...user, avatar: updated.avatar });
      setIsUploadingAvatar(false);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || "Failed to upload logo. Please try again.");
      setIsUploadingAvatar(false);
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
      } else if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
        setIsUploadingAvatar(true);
        uploadAvatarMutation.mutate(file);
      }
    }
    event.target.value = "";
  };

  const addCategory = () => {
    const trimmed = categoryDraft.trim();
    if (!trimmed || businessCategories.includes(trimmed)) {
      setCategoryDraft("");
      return;
    }
    setBusinessCategories((prev) => [...prev, trimmed]);
    setCategoryDraft("");
  };

  const removeCategory = (category: string) => {
    setBusinessCategories((prev) => prev.filter((c) => c !== category));
  };

  const handleSave = () => {
    if (!name.trim() || !companyName.trim() || !country.trim() || !state.trim() || !city.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateProfileMutation.mutate({
      name: name.trim(),
      companyName: companyName.trim(),
      businessCategories: businessCategories.join(","),
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
    });
  };

  const handleCancel = () => {
    if (profile) {
      setName(profile.name || "");
      setCompanyName(profile.companyName || "");
      setBusinessCategories(profile.brandDetails?.businessCategories || []);
      setCountry(profile.brandDetails?.country || "");
      setState(profile.brandDetails?.state || "");
      setCity(profile.brandDetails?.city || "");
      setRegistrationNumber(profile.brandDetails?.registrationNumber || "");
    }
    setIsEditing(false);
  };

  if (loadingProfile) return <PageLoader withLayout={false} message="Loading profile..." />;

  if (profileError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Profile"
        message="Unable to load your brand profile. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Brand profile
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Manage your company details and business categories.
        </p>
      </div>

      {profile?.brandDetails?.suspended && (
        <Card style={{ borderColor: "rgba(255,77,94,.3)" }}>
          <div className="flex items-start gap-3">
            <Pill tone="bad" dot>Suspended</Pill>
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 14, color: "var(--txt)" }}>
                Your account is suspended
              </h3>
              <p className="fb-hint mt-1">
                {profile.brandDetails.suspendedReason ||
                  "New campaigns, going live, self-resume, and Promote & Earn are blocked until an admin unsuspends your account."}
              </p>
              {typeof profile.brandDetails.strikeCount === "number" && (
                <p className="fb-hint mt-1">{profile.brandDetails.strikeCount} strike(s) on record.</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start">
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Company logo</h3>
          <div className="mt-3 flex flex-col items-center">
            <div className="relative group w-28 h-28">
              <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--ink-900)", border: "3px solid var(--line-2)" }}>
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Company logo"
                    width={112}
                    height={112}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-12 w-12" style={{ color: "var(--faint)" }} />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)" }}>
                <Camera className="h-6 w-6" style={{ color: "var(--txt)" }} />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={isUploadingAvatar} />
              </label>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              id="brand-avatar-file-input"
              disabled={isUploadingAvatar}
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center mt-4"
              onClick={() => document.getElementById("brand-avatar-file-input")?.click()}
              disabled={isUploadingAvatar}>
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload new logo
            </Button>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
            <Pill tone={profile?.brandDetails?.profileComplete ? "live" : "warn"} dot>
              {profile?.brandDetails?.profileComplete ? "Profile complete" : "Profile incomplete"}
            </Pill>
            <p className="fb-hint mt-2">
              {profile?.brandDetails?.profileComplete
                ? "Your profile is complete — campaigns can go live."
                : "Complete your profile to be able to go live with campaigns."}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Company information</h3>
              <p className="fb-hint">Update your company details and location.</p>
            </div>
            {!isEditing && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contact name">
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isEditing} placeholder="Your name" />
            </Field>
            <Field label="Company name">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!isEditing} placeholder="Company name" />
            </Field>
            <Field label="Registration number" className="sm:col-span-2">
              <Input
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. RC1234567"
              />
            </Field>
          </div>

          <div className="mt-3">
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", fontFamily: "var(--body)" }}>Business categories</p>
            {isEditing && (
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. Fashion, Tech"
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button type="button" variant="ghost" onClick={addCategory}>Add</Button>
              </div>
            )}
            {businessCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {businessCategories.map((category) => (
                  <Pill key={category}>
                    {category}
                    {isEditing && (
                      <button type="button" onClick={() => removeCategory(category)} aria-label={`Remove ${category}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Pill>
                ))}
              </div>
            ) : (
              <p className="fb-hint mt-1.5">No categories added yet.</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Country">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={!isEditing} placeholder="Country" />
            </Field>
            <Field label="State">
              <Input value={state} onChange={(e) => setState(e.target.value)} disabled={!isEditing} placeholder="State" />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!isEditing} placeholder="City" />
            </Field>
          </div>

          <Field label="Email" className="mt-3" hint="Contact support if you need to update it.">
            <Input type="email" value={profile?.email || ""} disabled />
          </Field>

          {isEditing && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
              <Button type="button" variant="primary" onClick={handleSave} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancel} disabled={updateProfileMutation.isPending}>
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

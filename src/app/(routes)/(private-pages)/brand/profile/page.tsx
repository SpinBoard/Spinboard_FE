"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Camera,
  Save,
  Edit,
  CheckCircle,
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
    }
    setIsEditing(false);
  };

  if (loadingProfile) return <PageLoader message="Loading profile..." />;

  if (profileError) {
    return (
      <PageError
        title="Failed to Load Profile"
        message="Unable to load your brand profile. Please check your connection and try again."
      />
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">Brand Profile</h1>
          <p className="text-muted-foreground">Manage your company details and business categories</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-sora text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-secondary" />
                Company Logo
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Upload a logo or keep your current one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 border-4 border-white/20 flex items-center justify-center">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Company logo"
                        width={128}
                        height={128}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                <div className="mt-4 w-full">
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
                    variant="outline"
                    className="w-full border-border text-foreground hover:bg-white/10"
                    onClick={() => document.getElementById("brand-avatar-file-input")?.click()}
                    disabled={isUploadingAvatar}>
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Logo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-foreground font-sora text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-secondary" />
                      Company Information
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Update your company details and location
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="border-border text-foreground hover:bg-white/10">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground font-medium">
                      Contact Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className="disabled:opacity-50"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-foreground font-medium">
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={!isEditing}
                      className="disabled:opacity-50"
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Business Categories</Label>
                  {isEditing && (
                    <div className="flex gap-2">
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
                      <Button type="button" variant="outline" onClick={addCategory}>
                        Add
                      </Button>
                    </div>
                  )}
                  {businessCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {businessCategories.map((category) => (
                        <Badge key={category} variant="secondary" className="flex items-center gap-1">
                          {category}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeCategory(category)}
                              aria-label={`Remove ${category}`}>
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No categories added yet.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground font-medium">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={!isEditing}
                      className="disabled:opacity-50"
                      placeholder="Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-foreground font-medium">
                      State
                    </Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={!isEditing}
                      className="disabled:opacity-50"
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground font-medium">
                      City
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={!isEditing}
                      className="disabled:opacity-50"
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Email Address
                  </Label>
                  <Input id="email" type="email" value={profile?.email || ""} disabled className="cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground">
                    Email address cannot be changed. Contact support if you need to update it.
                  </p>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={updateProfileMutation.isPending}
                      className="border-border text-foreground hover:bg-white/10">
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-foreground font-sora text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`p-4 rounded-lg border ${
                profile?.brandDetails?.profileComplete
                  ? "bg-success/10 border-success/20"
                  : "bg-yellow-500/10 border-yellow-500/20"
              }`}>
              <div
                className={`flex items-center gap-2 ${
                  profile?.brandDetails?.profileComplete ? "text-success" : "text-yellow-400"
                }`}>
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">
                  Profile {profile?.brandDetails?.profileComplete ? "Complete" : "Incomplete"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {profile?.brandDetails?.profileComplete
                  ? "Your profile is complete — campaigns can go live."
                  : "Complete your profile to be able to go live with campaigns."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

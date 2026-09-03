'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/freebiz-card'
import { Field } from '@/components/ui/freebiz-field'
import { Input } from '@/components/ui/freebiz-input'
import { Button } from '@/components/ui/freebiz-button'
import { Pill } from '@/components/ui/freebiz-pill'
import { Avatar } from '@/components/ui/freebiz-avatar'
import {
  Camera,
  Save,
  Edit,
  Upload,
  Loader2,
  User
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ViewerProfileData, ViewerSex } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/app/_utils/helper'
import { ENDPOINTS } from '@/app/_utils/endpoints'
import { useAtomValue, useSetAtom } from 'jotai'
import { userAtom } from '@/atom/user'
import { PageLoader } from '@/components/ui/page-loader'
import { PageError } from '@/components/ui/page-error'
import Image from 'next/image'
import { toast } from 'sonner'

const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

// design/freebiz-mockup.html data-screen="v-profile", "Your details" card
// only — DECISIONS.md originally kept referrals on their own route, since
// removed entirely 2026-08-29 (feature cut on both frontend and backend).
// The mockup's "Bank for payouts" field is still dropped — bank details
// live on /user/wallet, not here. "Phone" IS now real (§2 Revamp 6,
// settable via PUT /profile/viewer, display/contact only, never used for
// auth) and is restored as an editable field alongside the rest.
export default function ProfilePage() {
  const user = useAtomValue(userAtom)
  const setUser = useSetAtom(userAtom);
  const queryClient = useQueryClient()

  // Form states
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<ViewerSex | ''>('')
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Fetch user profile data
  const { data: profileData, error: profileError, isLoading: loadingProfile } = useQuery<ViewerProfileData>({
    queryKey: ["profile"],
    queryFn: () => api.get(ENDPOINTS.VIEWER_PROFILE).then((res) => {
      const profile = res.data.profile
      // Initialize form data when profile loads
      setFirstName(profile.firstName || '')
      setLastName(profile.lastName || '')
      setUsername(profile.username || '')
      setAge(profile.age ? String(profile.age) : '')
      setSex(profile.sex || '')
      setCountry(profile.country || '')
      setState(profile.state || '')
      setCity(profile.city || '')
      setPhone(profile.phone || '')
      setAvatarPreview(profile.avatar || '')
      return profile
    }),
    enabled: !!user?.accessToken,
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: {
      firstName: string;
      lastName: string;
      username: string;
      age?: number;
      sex?: ViewerSex;
      country?: string;
      state?: string;
      city?: string;
      phone?: string;
      avatar?: string;
    }) => {
      return api.put(ENDPOINTS.UPDATE_PROFILE, profileData);
    },
    onSuccess: (response) => {
      const profileData: ViewerProfileData = response.data.profile
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
      toast.success("Profile updated successfully!");

      // Update user atom with new profile data
      if (user) {
        setUser({
          ...user,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          fullName: `${profileData.firstName} ${profileData.lastName}`,
          username: profileData.username,
          avatar: profileData.avatar,
          profileComplete: profileData.profileComplete,
        });
      }
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast.error(apiErrorMessage(error, "Failed to update profile. Please try again."));
    },
  })

  // Separate mutation for avatar upload
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      return api.put(ENDPOINTS.UPDATE_PROFILE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      const profileData: ViewerProfileData = response.data.profile
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile picture updated successfully!");

      // Update user atom with new avatar
      if (user) {
        setUser({
          ...user,
          avatar: profileData.avatar
        });
      }
      setIsUploadingAvatar(false);
    },
    onError: (error) => {
      console.error('Failed to upload avatar:', error);
      toast.error(apiErrorMessage(error, "Failed to upload profile picture. Please try again."));
      setIsUploadingAvatar(false);
    },
  })

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }

      // Show preview immediately
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload the file immediately
      setIsUploadingAvatar(true)
      uploadAvatarMutation.mutate(file)
    }

    // Clear the input so the same file can be selected again if needed
    event.target.value = ''
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Prepare profile data for submission (excluding avatar)
      const profileUpdateData: {
        firstName: string;
        lastName: string;
        username: string;
        age?: number;
        sex?: ViewerSex;
        country?: string;
        state?: string;
        city?: string;
        phone?: string;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      }

      // Validate required fields
      if (!profileUpdateData.firstName || !profileUpdateData.lastName || !profileUpdateData.username) {
        toast.error("Please fill in all required fields");
        setIsSaving(false);
        return;
      }

      if (age) profileUpdateData.age = Number(age);
      if (sex) profileUpdateData.sex = sex;
      if (country.trim()) profileUpdateData.country = country.trim();
      if (state.trim()) profileUpdateData.state = state.trim();
      if (city.trim()) profileUpdateData.city = city.trim();
      if (phone.trim()) profileUpdateData.phone = phone.trim();

      await updateProfileMutation.mutateAsync(profileUpdateData);
    } catch (error) {
      // Error handling is done in the mutation's onError
    } finally {
      setIsSaving(false);
    }
  }

  const handleCancel = () => {
    // Reset form data to original values (excluding avatar)
    if (profileData) {
      setFirstName(profileData.firstName || '')
      setLastName(profileData.lastName || '')
      setUsername(profileData.username || '')
      setAge(profileData.age ? String(profileData.age) : '')
      setSex(profileData.sex || '')
      setCountry(profileData.country || '')
      setState(profileData.state || '')
      setCity(profileData.city || '')
      setPhone(profileData.phone || '')
    }
    setIsEditing(false)
  }

  if (loadingProfile) {
    return <PageLoader withLayout={false} message="Loading profile..." />
  }

  if (profileError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Profile"
        message="Unable to load your profile data. Please check your connection and try again."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}>
          Viewers / Profile
        </p>
        <h1
          className="mt-1"
          style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Your profile
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Your details help brands understand who is watching. They never see your name.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start">
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Profile picture</h3>
          <div className="mt-3 flex flex-col items-center">
            <div className="relative group w-28 h-28">
              <div className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--ink-900)", border: "3px solid var(--line-2)" }}>
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Profile"
                    width={112}
                    height={112}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : firstName || lastName ? (
                  <Avatar initials={initials(firstName, lastName)} style={{ width: "100%", height: "100%", fontSize: 28 }} />
                ) : (
                  <User className="h-12 w-12" style={{ color: "var(--faint)" }} />
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,.6)" }}>
                <Camera className="h-6 w-6" style={{ color: "var(--txt)" }} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-file-input"
              disabled={isUploadingAvatar}
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center mt-4"
              onClick={() => document.getElementById('avatar-file-input')?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload new photo
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "1px solid var(--line)" }}>
            <Pill tone={profileData?.isVerified ? "live" : "warn"} dot>
              {profileData?.isVerified ? "Verified" : "Unverified"}
            </Pill>
            <Pill tone={profileData?.profileComplete ? "live" : "warn"} dot>
              {profileData?.profileComplete ? "Profile complete" : "Profile incomplete"}
            </Pill>
            <p className="fb-hint">
              {profileData?.profileComplete
                ? "Your profile is complete — you can claim freebie codes on the board."
                : "Add your age, sex, country, state and city to unlock claiming freebie codes."}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Your details</h3>
              <p className="fb-hint">Used for audience reporting only, always aggregated.</p>
            </div>
            {!isEditing && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your first name"
              />
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your last name"
              />
            </Field>
            <Field label="Username" className="sm:col-span-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing}
                placeholder="Choose a unique username"
              />
            </Field>
            <Field label="Age">
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                disabled={!isEditing}
                placeholder="Your age"
              />
            </Field>
            <Field label="Sex">
              <select
                className="fb-input"
                value={sex}
                onChange={(e) => setSex(e.target.value as ViewerSex)}
                disabled={!isEditing}
              >
                <option value="" disabled>Select</option>
                <option value="man">Man</option>
                <option value="woman">Woman</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
            <Field label="Country">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} disabled={!isEditing} placeholder="Country" />
            </Field>
            <Field label="State">
              <Input value={state} onChange={(e) => setState(e.target.value)} disabled={!isEditing} placeholder="State" />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} disabled={!isEditing} placeholder="City" />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} placeholder="Phone number" />
            </Field>
            <Field label="Email" className="sm:col-span-2" hint="Contact support if you need to update it.">
              <Input value={profileData?.email || ''} disabled />
            </Field>
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || updateProfileMutation.isPending}
              >
                {(isSaving || updateProfileMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving || updateProfileMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

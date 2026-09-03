import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { BrandProfileData, ViewerProfileData, MeResponse, UserData } from "@/types";

interface AuthedLoginData {
  accessToken: string;
  refreshToken: string;
  user: { role: "viewer" | "brand" | "admin" };
}

// Shared by login, verify-otp, and Google auth — all three receive the same
// { accessToken, refreshToken, user: { role } } shape from the backend and
// then need to fetch the full profile to build the UserData the app stores.
// Extracted here to stop the fetch-profile-then-setUser logic being
// duplicated (and drifting) across those three call sites.
export async function fetchUserDataForSession(loginData: AuthedLoginData): Promise<{
  userData: UserData;
  dashboardRoute: "viewer" | "brand" | "admin";
}> {
  const authHeader = { headers: { Authorization: `Bearer ${loginData.accessToken}` } };

  // Admin accounts aren't self-registered — there's no viewer/brand profile
  // to fetch, so this falls back to the generic cached-session-user route.
  if (loginData.user.role === "admin") {
    const response = await api.get<MeResponse>(ENDPOINTS.USER_ME, authHeader);
    const me = response.data.user;
    return {
      dashboardRoute: "admin",
      userData: {
        id: me._id,
        firstName: me.firstName,
        lastName: me.lastName,
        username: me.username,
        fullName: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.username || me.email,
        avatar: me.avatar,
        email: me.email,
        userType: me.role,
        isVerified: me.isVerified,
        createdAt: me.createdAt,
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
      },
    };
  }

  if (loginData.user.role === "viewer") {
    const response = await api.get<{ profile: ViewerProfileData }>(
      ENDPOINTS.VIEWER_PROFILE,
      authHeader
    );
    const viewerData = response.data.profile;
    return {
      dashboardRoute: "viewer",
      userData: {
        id: viewerData._id,
        firstName: viewerData.firstName,
        lastName: viewerData.lastName,
        fullName: `${viewerData.firstName} ${viewerData.lastName}`,
        avatar: viewerData.avatar,
        username: viewerData.username,
        email: viewerData.email,
        userType: viewerData.role,
        isVerified: viewerData.isVerified,
        profileComplete: viewerData.profileComplete,
        createdAt: viewerData.createdAt,
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
      },
    };
  }

  const response = await api.get<{ profile: BrandProfileData }>(
    ENDPOINTS.BRAND_PROFILE,
    authHeader
  );
  const brandData = response.data.profile;
  return {
    dashboardRoute: "brand",
    userData: {
      id: brandData._id,
      fullName: brandData.name,
      email: brandData.email,
      userType: brandData.role,
      isVerified: brandData.isVerified,
      profileComplete: brandData.brandDetails?.profileComplete,
      createdAt: brandData.createdAt,
      companyName: brandData?.companyName,
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
    },
  };
}

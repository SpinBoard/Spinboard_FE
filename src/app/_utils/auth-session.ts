import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { BrandProfileData, GamerProfileData, MeResponse, UserData } from "@/types";

interface AuthedLoginData {
  accessToken: string;
  refreshToken: string;
  user: { role: "gamer" | "brand" | "admin" };
}

// Shared by login, verify-otp, and Google auth — all three receive the same
// { accessToken, refreshToken, user: { role } } shape from the backend and
// then need to fetch the full profile to build the UserData the app stores.
// Extracted here to stop the fetch-profile-then-setUser logic being
// duplicated (and drifting) across those three call sites.
export async function fetchUserDataForSession(loginData: AuthedLoginData): Promise<{
  userData: UserData;
  dashboardRoute: "gamer" | "brand" | "admin";
}> {
  const authHeader = { headers: { Authorization: `Bearer ${loginData.accessToken}` } };

  // Admin accounts aren't self-registered — there's no gamer/brand profile
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

  if (loginData.user.role === "gamer") {
    const response = await api.get<{ profile: GamerProfileData }>(
      ENDPOINTS.GAMER_PROFILE,
      authHeader
    );
    const gamerData = response.data.profile;
    return {
      dashboardRoute: "gamer",
      userData: {
        id: gamerData._id,
        firstName: gamerData.firstName,
        lastName: gamerData.lastName,
        fullName: `${gamerData.firstName} ${gamerData.lastName}`,
        avatar: gamerData.avatar,
        username: gamerData.username,
        email: gamerData.email,
        leaderboardPosition: gamerData.leaderboardPosition,
        userType: gamerData.role,
        isVerified: gamerData.isVerified,
        profileComplete: gamerData.profileComplete,
        createdAt: gamerData.createdAt,
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

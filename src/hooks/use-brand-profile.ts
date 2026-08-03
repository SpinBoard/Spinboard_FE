import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { BrandProfileData } from "@/types";

export function useBrandProfile() {
  const user = useAtomValue(userAtom);

  return useQuery<BrandProfileData>({
    queryKey: ["brand-profile"],
    queryFn: () =>
      api.get<{ profile: BrandProfileData }>(ENDPOINTS.BRAND_PROFILE).then((res) => res.data.profile),
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

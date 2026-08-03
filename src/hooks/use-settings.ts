import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { Settings, SettingsResponse } from "@/types";

// AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §5 — one aggregate call backing
// both the viewer and brand Settings pages (role-discriminated response).
export function useSettings() {
  const user = useAtomValue(userAtom);

  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () =>
      api.get<SettingsResponse>(ENDPOINTS.SETTINGS).then((res) => res.data.settings),
    enabled: !!user?.accessToken,
  });
}

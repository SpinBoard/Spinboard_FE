import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  Project,
  ProjectCreateRequest,
  ProjectResponse,
  ProjectsResponse,
  ProjectQuotationsResponse,
  Quotation,
  QuotationCreateRequest,
  QuotationResponse,
  QuotationUnlockStatusResponse,
  QuotationUnlockPurchaseResponse,
} from "@/types";

const PROJECTS_MINE_KEY = ["projects-mine"];
const PROJECTS_BROWSE_KEY = ["projects-browse"];

// GET /projects — open projects posted by other KYC-verified businesses,
// to browse and quote on.
export function useBrowseProjects(category?: string) {
  const user = useAtomValue(userAtom);
  return useQuery<Project[]>({
    queryKey: [...PROJECTS_BROWSE_KEY, category ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const query = params.toString();
      return api
        .get<ProjectsResponse>(`${ENDPOINTS.PROJECTS}${query ? `?${query}` : ""}`)
        .then((res) => res.data.projects);
    },
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

// GET /projects/mine — the poster's own, any status.
export function useMyProjects() {
  const user = useAtomValue(userAtom);
  return useQuery<Project[]>({
    queryKey: PROJECTS_MINE_KEY,
    queryFn: () => api.get<ProjectsResponse>(ENDPOINTS.PROJECTS_MINE).then((res) => res.data.projects),
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

// GET /projects/:id — works for either the poster viewing their own
// project or another brand viewing an open one to decide whether to quote.
export function useProject(id: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => api.get<ProjectResponse>(ENDPOINTS.PROJECT_DETAILS(id!)).then((res) => res.data.project),
    enabled: !!user?.accessToken && !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCreateRequest) =>
      api.post<ProjectResponse>(ENDPOINTS.PROJECTS, payload).then((res) => res.data.project),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_MINE_KEY }),
  });
}

export function useCloseProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ProjectResponse>(ENDPOINTS.PROJECT_CLOSE(id)).then((res) => res.data.project),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_MINE_KEY });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export function useCancelProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<ProjectResponse>(ENDPOINTS.PROJECT_CANCEL(id)).then((res) => res.data.project),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_MINE_KEY });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

// GET /projects/:id/quotations — the paywall response: free quotation
// always visible, the rest only with an active unlock pass.
export function useProjectQuotations(projectId: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<ProjectQuotationsResponse>({
    queryKey: ["project-quotations", projectId],
    queryFn: () =>
      api.get<ProjectQuotationsResponse>(ENDPOINTS.PROJECT_QUOTATIONS(projectId!)).then((res) => res.data),
    enabled: !!user?.accessToken && !!projectId,
  });
}

export function useCreateQuotation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuotationCreateRequest) =>
      api
        .post<QuotationResponse>(ENDPOINTS.PROJECT_QUOTATIONS(projectId), payload)
        .then((res) => res.data.quotation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-quotations", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useWithdrawQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quotationId }: { quotationId: string; projectId: string }) =>
      api.post<QuotationResponse>(ENDPOINTS.QUOTATION_WITHDRAW(quotationId)).then((res) => res.data.quotation),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-quotations", variables.projectId] });
    },
  });
}

// ── Quotation-unlock pass (account-wide, 30-day, wallet debit) ──

export function useQuotationUnlockStatus() {
  const user = useAtomValue(userAtom);
  return useQuery<QuotationUnlockStatusResponse>({
    queryKey: ["quotation-unlock-status"],
    queryFn: () =>
      api.get<QuotationUnlockStatusResponse>(ENDPOINTS.QUOTATION_UNLOCK_STATUS).then((res) => res.data),
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

export function usePurchaseQuotationUnlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<QuotationUnlockPurchaseResponse>(ENDPOINTS.QUOTATION_UNLOCK_PURCHASE)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-unlock-status"] });
      queryClient.invalidateQueries({ queryKey: ["project-quotations"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
  });
}

// ── Admin: unfiltered view of a project's quotations ──

export function useAdminProjectQuotations(projectId: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<Quotation[]>({
    queryKey: ["admin-project-quotations", projectId],
    queryFn: () =>
      api
        .get<{ quotations: Quotation[] }>(ENDPOINTS.ADMIN_PROJECT_QUOTATIONS(projectId!))
        .then((res) => res.data.quotations),
    enabled: !!user?.accessToken && user.userType === "admin" && !!projectId,
  });
}

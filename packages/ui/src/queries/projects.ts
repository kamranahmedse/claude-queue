import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpGet, httpPost, httpDelete } from "~/lib/http";
import type { Project } from "~/types";

export function listProjectsOptions() {
  return queryOptions({
    queryKey: ["projects"],
    queryFn: () => httpGet<Project[]>("/projects"),
  });
}

export function projectOptions(projectId: string) {
  return queryOptions({
    queryKey: ["project", projectId],
    queryFn: () => httpGet<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { path: string; name: string }) =>
      httpPost<Project>("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      httpDelete<{ success: boolean }>(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

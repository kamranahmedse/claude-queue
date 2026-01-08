import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpGet, httpPost, httpPatch, httpDelete } from "~/lib/http";
import type { Template, Task, TaskStatus } from "~/types";

export function listTemplatesOptions(projectId: string) {
  return queryOptions({
    queryKey: ["templates", projectId],
    queryFn: () => httpGet<Template[]>(`/templates/project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateTemplate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      httpPost<Template>(`/templates/project/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates", projectId] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      ...data
    }: {
      templateId: string;
      title?: string;
      description?: string;
    }) => httpPatch<Template>(`/templates/${templateId}`, data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["templates", template.project_id] });
    },
  });
}

export function useMoveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      position,
    }: {
      templateId: string;
      position: number;
    }) => httpPost<Template>(`/templates/${templateId}/move`, { position }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["templates", template.project_id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      httpDelete<{ success: boolean }>(`/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useCreateTaskFromTemplate(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      status,
    }: {
      templateId: string;
      status: TaskStatus;
    }) => httpPost<Task>(`/templates/${templateId}/create-task`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

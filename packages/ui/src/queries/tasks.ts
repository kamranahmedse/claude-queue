import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpGet, httpPost, httpPatch, httpDelete } from "~/lib/http";
import type { Task, TaskWithActivities, Comment, TaskStatus } from "~/types";

export function listTasksOptions(projectId: string) {
  return queryOptions({
    queryKey: ["tasks", projectId],
    queryFn: () => httpGet<Task[]>(`/tasks/project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useTasksRefetchInterval(): number | false {
  return 2000;
}

export function taskDetailsOptions(taskId: string) {
  return queryOptions({
    queryKey: ["task", taskId],
    queryFn: () => httpGet<TaskWithActivities>(`/tasks/${taskId}`),
    enabled: !!taskId,
    refetchInterval: 2000,
  });
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; description?: string; status?: TaskStatus }) =>
      httpPost<Task>(`/tasks/project/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string;
      title?: string;
      description?: string | null;
      blocked?: boolean;
      current_activity?: string;
    }) => httpPatch<Task>(`/tasks/${taskId}`, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.project_id] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["moveTask"],
    mutationFn: ({
      taskId,
      status,
      position,
    }: {
      taskId: string;
      status: TaskStatus;
      position: number;
    }) => httpPost<Task>(`/tasks/${taskId}/move`, { status, position }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.project_id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      httpDelete<{ success: boolean }>(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteAllTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TaskStatus) =>
      httpDelete<{ success: boolean; deleted: number }>(`/tasks/project/${projectId}/status/${status}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });
}

export function useAddComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      httpPost<Comment>(`/comments/task/${taskId}`, { author: "user", content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      httpDelete<void>(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useForceResetTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status = "backlog",
    }: {
      taskId: string;
      status?: "ready" | "backlog";
    }) => httpPost<Task>(`/tasks/${taskId}/force-reset`, { status }),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", task.project_id] });
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });
}

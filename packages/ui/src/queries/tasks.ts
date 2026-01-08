import { queryOptions, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query";
import { httpGet, httpPost, httpPatch, httpDelete } from "~/lib/http";
import type { Task, TaskWithActivities, Comment, TaskStatus } from "~/types";

export function listTasksOptions(projectId: string) {
  return queryOptions({
    queryKey: ["tasks", projectId],
    queryFn: () => httpGet<Task[]>(`/tasks/project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useTasksRefetchInterval() {
  const isMutating = useIsMutating({ mutationKey: ["moveTask"] });
  return isMutating > 0 ? false : 2000;
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
      description?: string;
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
    onMutate: async ({ taskId, status, position }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const queriesData = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] });

      for (const [queryKey, tasks] of queriesData) {
        if (!tasks) {
          continue;
        }

        const taskIndex = tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) {
          continue;
        }

        const task = tasks[taskIndex];
        const oldStatus = task.status;
        const oldPosition = task.position;

        const updatedTasks = tasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, status, position };
          }

          if (t.status === oldStatus && t.id !== taskId) {
            if (t.position > oldPosition) {
              return { ...t, position: t.position - 1 };
            }
          }

          if (t.status === status && t.id !== taskId) {
            if (t.position >= position) {
              return { ...t, position: t.position + 1 };
            }
          }

          return t;
        });

        queryClient.setQueryData(queryKey, updatedTasks);
      }

      return { queriesData };
    },
    onError: (_err, _variables, context) => {
      if (context?.queriesData) {
        for (const [queryKey, data] of context.queriesData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (task) => {
      if (task) {
        queryClient.invalidateQueries({ queryKey: ["tasks", task.project_id] });
      }
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

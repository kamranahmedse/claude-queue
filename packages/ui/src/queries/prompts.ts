import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpGet, httpPut } from "~/lib/http";
import type { Prompt } from "~/types";

export function masterPromptOptions() {
  return queryOptions({
    queryKey: ["prompts", "master"],
    queryFn: () => httpGet<Prompt | null>("/prompts/master"),
  });
}

export function projectPromptOptions(projectId: string) {
  return queryOptions({
    queryKey: ["prompts", "project", projectId],
    queryFn: () => httpGet<Prompt | null>(`/prompts/project/${projectId}`),
    enabled: !!projectId,
  });
}

export function useUpdateMasterPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => httpPut<Prompt>("/prompts/master", { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", "master"] });
    },
  });
}

export function useUpdateProjectPrompt(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => httpPut<Prompt>(`/prompts/project/${projectId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts", "project", projectId] });
    },
  });
}

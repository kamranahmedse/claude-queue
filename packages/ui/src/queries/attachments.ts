import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpGet, httpPost, httpDelete } from "~/lib/http";
import type { Attachment } from "~/types";

export function listAttachmentsOptions(taskId: string) {
  return queryOptions({
    queryKey: ["attachments", taskId],
    queryFn: () => httpGet<Attachment[]>(`/attachments/task/${taskId}`),
    enabled: !!taskId,
  });
}

export function listTemplateAttachmentsOptions(templateId: string) {
  return queryOptions({
    queryKey: ["attachments", "template", templateId],
    queryFn: () => httpGet<Attachment[]>(`/attachments/template/${templateId}`),
    enabled: !!templateId,
  });
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const data = await fileToBase64(file);
      return httpPost<Attachment>(`/attachments/task/${taskId}`, {
        filename: file.name,
        data,
        mimeType: file.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => httpDelete<void>(`/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
  });
}

export function useUploadTemplateAttachment(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const data = await fileToBase64(file);
      return httpPost<Attachment>(`/attachments/template/${templateId}`, {
        filename: file.name,
        data,
        mimeType: file.type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", "template", templateId] });
    },
  });
}

export function useDeleteTemplateAttachment(templateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) => httpDelete<void>(`/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", "template", templateId] });
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getAttachmentUrl(attachmentId: string): string {
  return `/api/attachments/${attachmentId}/file`;
}

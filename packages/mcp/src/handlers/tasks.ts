import { httpGet, httpPost } from "../http.ts";
import type { ToolResult } from "./index.ts";

export interface Project {
  id: string;
  name: string;
  path: string;
  paused: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  blocked: boolean;
  current_activity: string | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
}

export interface AttachmentPath {
  path: string;
}

export interface Prompt {
  id: string;
  project_id: string | null;
  type: "master" | "project";
  content: string;
}

export async function handleGetTasks(args: Record<string, unknown>): Promise<ToolResult> {
  const projectId = args?.projectId as string;
  const status = args?.status as string | undefined;

  const project = await httpGet<Project>(`/api/projects/${projectId}?heartbeat=true`);

  if (project.paused) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            paused: true,
            message: "Project is paused. Wait for user to resume before picking up new tasks.",
          }),
        },
      ],
    };
  }

  const url = status
    ? `/api/tasks/project/${projectId}?status=${status}`
    : `/api/tasks/project/${projectId}`;
  const tasks = await httpGet<Task[]>(url);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(tasks, null, 2),
      },
    ],
  };
}

export async function handleClaimTask(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const starting_commit = args?.starting_commit as string;
  const task = await httpPost<Task>(`/api/tasks/${taskId}/move`, {
    status: "in_progress",
    position: 0,
    starting_commit,
  });

  const [attachments, masterPrompt, projectPrompt] = await Promise.all([
    httpGet<Attachment[]>(`/api/attachments/task/${taskId}`),
    httpGet<Prompt | null>(`/api/prompts/master`),
    httpGet<Prompt | null>(`/api/prompts/project/${task.project_id}`),
  ]);

  const imageAttachments = attachments.filter((a) =>
    a.mime_type.startsWith("image/")
  );

  const content: ToolResult["content"] = [];

  const hasPrompts = masterPrompt || projectPrompt;
  if (hasPrompts) {
    const promptParts: string[] = [];
    if (masterPrompt) {
      promptParts.push(`## Master Instructions\n${masterPrompt.content}`);
    }
    if (projectPrompt) {
      promptParts.push(`## Project Instructions\n${projectPrompt.content}`);
    }
    content.push({
      type: "text",
      text: `# Custom Instructions\n\n${promptParts.join("\n\n")}`,
    });
  }

  content.push({
    type: "text",
    text: `Claimed task: "${task.title}" - now in progress (starting commit: ${starting_commit})`,
  });

  if (imageAttachments.length > 0) {
    const attachmentPaths: string[] = [];
    for (const attachment of imageAttachments) {
      const pathData = await httpGet<AttachmentPath>(`/api/attachments/${attachment.id}/path`);
      attachmentPaths.push(pathData.path);
    }

    content.push({
      type: "text",
      text: `\n\nThis task has ${imageAttachments.length} image attachment(s). Read these files to see the images:\n${attachmentPaths.map((p) => `- ${p}`).join("\n")}`,
    });
  }

  return { content };
}

export async function handleCompleteTask(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const task = await httpPost<Task>(`/api/tasks/${taskId}/move`, {
    status: "done",
    position: 0,
  });

  return {
    content: [
      {
        type: "text",
        text: `Task "${task.title}" completed and moved to Done!`,
      },
    ],
  };
}

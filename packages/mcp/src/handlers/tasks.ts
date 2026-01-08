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
  title: string;
  status: string;
  blocked: boolean;
  current_activity: string | null;
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

  return {
    content: [
      {
        type: "text",
        text: `Claimed task: "${task.title}" - now in progress (starting commit: ${starting_commit})`,
      },
    ],
  };
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

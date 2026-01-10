import { httpPost } from "../http.ts";
import type { ToolResult } from "./index.ts";
import type { Task } from "./tasks.ts";

interface CreateTaskArgs {
  projectId: string;
  title: string;
  description?: string;
  status?: "backlog" | "ready";
}

export async function handleCreateTask(args: Record<string, unknown>): Promise<ToolResult> {
  const { projectId, title, description, status = "ready" } = args as unknown as CreateTaskArgs;

  const task = await httpPost<Task>(`/api/tasks/project/${projectId}`, {
    title,
    description: description || null,
    status,
  });

  return {
    content: [
      {
        type: "text",
        text: `Created task "${task.title}" in ${status} column (id: ${task.id})`,
      },
    ],
  };
}

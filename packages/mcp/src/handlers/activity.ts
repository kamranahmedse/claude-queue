import { httpPatch } from "../http.ts";
import type { ToolResult } from "./index.ts";

export async function handleUpdateActivity(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const activity = args?.activity as string;
  await httpPatch(`/api/tasks/${taskId}`, { current_activity: activity });

  return {
    content: [
      {
        type: "text",
        text: `Activity updated: ${activity}`,
      },
    ],
  };
}

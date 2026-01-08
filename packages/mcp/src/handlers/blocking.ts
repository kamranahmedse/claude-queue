import { KANBAN_URL, httpPatch, httpPost } from "../http.ts";
import type { ToolResult } from "./index.ts";

export async function handleSetBlocked(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const question = args?.question as string;

  await httpPatch(`/api/tasks/${taskId}`, {
    blocked: true,
    current_activity: "Waiting for user input",
  });

  await httpPost(`/api/comments/task/${taskId}`, {
    author: "claude",
    content: question,
  });

  return {
    content: [
      {
        type: "text",
        text: "Task marked as blocked. Question posted to user.",
      },
    ],
  };
}

export async function handleWaitForReply(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;

  try {
    const response = await fetch(`${KANBAN_URL}/api/comments/task/${taskId}/wait-for-reply`);

    if (response.status === 404) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ deleted: true }),
          },
        ],
      };
    }

    const data = await response.json();

    if (data.deleted) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ deleted: true }),
          },
        ],
      };
    }

    if (data.timeout) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ timeout: true }),
          },
        ],
      };
    }

    await httpPatch(`/api/tasks/${taskId}`, { blocked: false });
    await httpPatch(`/api/comments/task/${taskId}/mark-seen`, {});

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ reply: data.content }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: String(error) }),
        },
      ],
    };
  }
}

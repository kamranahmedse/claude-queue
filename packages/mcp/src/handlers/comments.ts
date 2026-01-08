import { httpGet, httpPatch, httpPost } from "../http.ts";
import type { ToolResult } from "./index.ts";

export interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  seen: boolean;
  created_at: string;
}

export async function handleCheckComments(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const since = args?.since as string | undefined;

  const url = since
    ? `/api/comments/task/${taskId}?since=${encodeURIComponent(since)}`
    : `/api/comments/task/${taskId}`;

  const comments = await httpGet<Comment[]>(url);
  const userComments = comments.filter((c) => c.author === "user");
  const unseenComments = userComments.filter((c) => !c.seen);

  if (unseenComments.length > 0) {
    await httpPatch(`/api/comments/task/${taskId}/mark-seen`, {});
    await httpPatch(`/api/tasks/${taskId}`, { blocked: false });
  }

  if (userComments.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ comments: [], hasNewComments: false }),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          comments: userComments,
          hasNewComments: unseenComments.length > 0,
          latestTimestamp: userComments[userComments.length - 1].created_at,
        }),
      },
    ],
  };
}

export async function handleAddComment(args: Record<string, unknown>): Promise<ToolResult> {
  const taskId = args?.taskId as string;
  const content = args?.content as string;

  await httpPost(`/api/comments/task/${taskId}`, {
    author: "claude",
    content,
  });

  return {
    content: [
      {
        type: "text",
        text: "Comment added",
      },
    ],
  };
}

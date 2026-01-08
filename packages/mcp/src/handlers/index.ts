import { handleWatch } from "./watch.ts";
import { handleGetTasks, handleClaimTask, handleCompleteTask } from "./tasks.ts";
import { handleUpdateActivity } from "./activity.ts";
import { handleSetBlocked, handleWaitForReply } from "./blocking.ts";
import { handleCheckComments, handleAddComment } from "./comments.ts";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

export const handlers: Record<string, Handler> = {
  kanban_watch: handleWatch,
  kanban_get_tasks: handleGetTasks,
  kanban_claim_task: handleClaimTask,
  kanban_update_activity: handleUpdateActivity,
  kanban_set_blocked: handleSetBlocked,
  kanban_wait_for_reply: handleWaitForReply,
  kanban_complete_task: handleCompleteTask,
  kanban_check_comments: handleCheckComments,
  kanban_add_comment: handleAddComment,
};

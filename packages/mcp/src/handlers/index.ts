import { handleWatch } from "./watch.ts";
import { handleGetTasks, handleClaimTask, handleCompleteTask } from "./tasks.ts";
import { handleCreateTask } from "./create-task.ts";
import { handleUpdateActivity } from "./activity.ts";
import { handleSetBlocked, handleWaitForReply } from "./blocking.ts";
import { handleCheckComments, handleAddComment } from "./comments.ts";
import { handleListProjects } from "./list-projects.ts";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

export const handlers: Record<string, Handler> = {
  queue_watch: handleWatch,
  queue_get_tasks: handleGetTasks,
  queue_claim_task: handleClaimTask,
  queue_create_task: handleCreateTask,
  queue_update_activity: handleUpdateActivity,
  queue_set_blocked: handleSetBlocked,
  queue_wait_for_reply: handleWaitForReply,
  queue_complete_task: handleCompleteTask,
  queue_check_comments: handleCheckComments,
  queue_add_comment: handleAddComment,
  queue_list_projects: handleListProjects,
};

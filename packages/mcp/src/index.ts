#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleWatch } from "./handlers/watch.ts";
import { handleGetTasks, handleClaimTask, handleCompleteTask } from "./handlers/tasks.ts";
import { handleUpdateActivity } from "./handlers/activity.ts";
import { handleSetBlocked, handleWaitForReply } from "./handlers/blocking.ts";
import { handleCheckComments, handleAddComment } from "./handlers/comments.ts";

const server = new McpServer({
  name: "claude-board",
  version: "1.0.0",
});

server.registerTool(
  "kanban_watch",
  {
    description: "Connect to a kanban board and start watching for tasks. Returns instructions for the watching loop.",
    inputSchema: {
      projectId: z.string().describe("Project ID (e.g., kbn-a3x9)"),
    },
  },
  async (args) => {
    return await handleWatch(args);
  }
);

server.registerTool(
  "kanban_get_tasks",
  {
    description: "Get tasks from the board, optionally filtered by status",
    inputSchema: {
      projectId: z.string().describe("Project ID"),
      status: z.enum(["backlog", "ready", "in_progress", "done"]).optional().describe("Filter by status (optional)"),
    },
  },
  async (args) => {
    return await handleGetTasks(args);
  }
);

server.registerTool(
  "kanban_claim_task",
  {
    description: "Claim a ready task and move it to in_progress. Pass the current git commit hash as starting_commit - this will be used to reset changes if the task is cancelled.",
    inputSchema: {
      taskId: z.string().describe("Task ID to claim"),
      starting_commit: z.string().describe("Current git commit hash (from `git rev-parse HEAD`). Used to reset changes if task is cancelled."),
    },
  },
  async (args) => {
    return await handleClaimTask(args);
  }
);

server.registerTool(
  "kanban_update_activity",
  {
    description: "Update what you're currently doing on a task",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      activity: z.string().describe("Current activity (e.g., 'Reading auth module')"),
    },
  },
  async (args) => {
    return await handleUpdateActivity(args);
  }
);

server.registerTool(
  "kanban_set_blocked",
  {
    description: "Mark task as blocked and ask user a question",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      question: z.string().describe("Question to ask the user"),
    },
  },
  async (args) => {
    return await handleSetBlocked(args);
  }
);

server.registerTool(
  "kanban_wait_for_reply",
  {
    description: "Poll until user replies to your question. Returns { reply: string } or { deleted: true } if task was deleted.",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
    },
  },
  async (args) => {
    return await handleWaitForReply(args);
  }
);

server.registerTool(
  "kanban_complete_task",
  {
    description: "Mark task as complete and move to done",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
    },
  },
  async (args) => {
    return await handleCompleteTask(args);
  }
);

server.registerTool(
  "kanban_check_comments",
  {
    description: "Check for new user comments on a task. Call this periodically while working to see if the user has left feedback or instructions.",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      since: z.string().optional().describe("ISO timestamp to check for comments after (optional). If not provided, returns all user comments."),
    },
  },
  async (args) => {
    return await handleCheckComments(args);
  }
);

server.registerTool(
  "kanban_add_comment",
  {
    description: "Add a comment to a task. Use this to leave summaries or notes.",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      content: z.string().describe("Comment content"),
    },
  },
  async (args) => {
    return await handleAddComment(args);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

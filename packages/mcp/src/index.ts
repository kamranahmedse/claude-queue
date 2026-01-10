#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleWatch } from "./handlers/watch.ts";
import { handleGetTasks, handleClaimTask, handleCompleteTask, handleMoveTask } from "./handlers/tasks.ts";
import { handleCreateTask } from "./handlers/create-task.ts";
import { handleUpdateActivity } from "./handlers/activity.ts";
import { handleSetBlocked, handleWaitForReply } from "./handlers/blocking.ts";
import { handleCheckComments, handleAddComment } from "./handlers/comments.ts";
import { handleListProjects } from "./handlers/list-projects.ts";

const server = new McpServer({
  name: "claude-queue",
  version: "1.0.0",
});

server.registerTool(
  "queue_watch",
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
  "queue_get_tasks",
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
  "queue_claim_task",
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
  "queue_create_task",
  {
    description: "Create a new task in a project. Used during planning mode to add tasks to the queue.",
    inputSchema: {
      projectId: z.string().describe("Project ID (e.g., kbn-a3x9)"),
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description (optional)"),
      status: z.enum(["backlog", "ready"]).optional().describe("Task status: 'backlog' or 'ready' (default: 'ready')"),
    },
  },
  async (args) => {
    return await handleCreateTask(args);
  }
);

server.registerTool(
  "queue_update_activity",
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
  "queue_set_blocked",
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
  "queue_wait_for_reply",
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
  "queue_complete_task",
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
  "queue_move_task",
  {
    description: "Move a task to a different status column (backlog, ready, in_progress, or done). Use this when a task is cancelled or needs to be deferred.",
    inputSchema: {
      taskId: z.string().describe("Task ID"),
      status: z.enum(["backlog", "ready", "in_progress", "done"]).describe("Target status to move the task to"),
    },
  },
  async (args) => {
    return await handleMoveTask(args);
  }
);

server.registerTool(
  "queue_check_comments",
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
  "queue_add_comment",
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

server.registerTool(
  "queue_list_projects",
  {
    description: "List all available projects. Use this when no project ID is provided or when a project is not found.",
    inputSchema: {},
  },
  async () => {
    return await handleListProjects();
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

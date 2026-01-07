#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const KANBAN_URL = process.env.KANBAN_SERVER_URL || "http://localhost:3333";

interface Project {
  id: string;
  name: string;
  path: string;
  paused: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  blocked: boolean;
  current_activity: string | null;
}

async function httpGet<T>(url: string): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function httpPost<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function httpPatch<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${KANBAN_URL}${url}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

const server = new Server(
  {
    name: "claude-kanban",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "kanban_watch",
      description: "Connect to a kanban board and start watching for tasks. Returns instructions for the watching loop.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Project ID (e.g., kbn-a3x9)",
          },
        },
        required: ["projectId"],
      },
    },
    {
      name: "kanban_get_tasks",
      description: "Get tasks from the board, optionally filtered by status",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Project ID",
          },
          status: {
            type: "string",
            enum: ["backlog", "ready", "in_progress", "done"],
            description: "Filter by status (optional)",
          },
        },
        required: ["projectId"],
      },
    },
    {
      name: "kanban_claim_task",
      description: "Claim a ready task and move it to in_progress",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID to claim",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "kanban_update_activity",
      description: "Update what you're currently doing on a task",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
          activity: {
            type: "string",
            description: "Current activity (e.g., 'Reading auth module')",
          },
        },
        required: ["taskId", "activity"],
      },
    },
    {
      name: "kanban_set_blocked",
      description: "Mark task as blocked and ask user a question",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
          question: {
            type: "string",
            description: "Question to ask the user",
          },
        },
        required: ["taskId", "question"],
      },
    },
    {
      name: "kanban_wait_for_reply",
      description: "Poll until user replies to your question. Returns { reply: string } or { deleted: true } if task was deleted.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "kanban_complete_task",
      description: "Mark task as complete and move to done",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "kanban_check_comments",
      description: "Check for new user comments on a task. Call this periodically while working to see if the user has left feedback or instructions.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
          since: {
            type: "string",
            description: "ISO timestamp to check for comments after (optional). If not provided, returns all user comments.",
          },
        },
        required: ["taskId"],
      },
    },
    {
      name: "kanban_add_comment",
      description: "Add a comment to a task. Use this to leave summaries or notes.",
      inputSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Task ID",
          },
          content: {
            type: "string",
            description: "Comment content",
          },
        },
        required: ["taskId", "content"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "kanban_watch": {
        const projectId = args?.projectId as string;
        const project = await httpGet<Project>(`/api/projects/${projectId}?heartbeat=true`);

        const pausedWarning = project.paused
          ? `\n\n⚠️ WARNING: This project is currently PAUSED. Claude will not pick up new tasks until resumed. The user can click "Resume" in the kanban board UI to allow task processing.`
          : "";

        return {
          content: [
            {
              type: "text",
              text: `Connected to project "${project.name}" (${project.id}).${pausedWarning}

You are now watching this kanban board. Follow this loop:
1. Call kanban_get_tasks with status "ready" to find available tasks
2. If found, call kanban_claim_task to start working
3. Update kanban_update_activity periodically as you work
4. If you need user input, call kanban_set_blocked with your question
5. Call kanban_wait_for_reply to wait for user response
6. When done, call kanban_complete_task
7. Auto-commit changes: git add -A && git commit -m "task: {title}"
8. Repeat from step 1

If a task is deleted while you're working on it, run: git reset --hard HEAD
If kanban_wait_for_reply returns { deleted: true }, discard changes and pick the next task.`,
            },
          ],
        };
      }

      case "kanban_get_tasks": {
        const projectId = args?.projectId as string;
        const status = args?.status as string | undefined;

        const project = await httpGet<Project>(`/api/projects/${projectId}?heartbeat=true`);

        if (project.paused) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ paused: true, message: "Project is paused. Wait for user to resume before picking up new tasks." }),
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

      case "kanban_claim_task": {
        const taskId = args?.taskId as string;
        const task = await httpPost<Task>(`/api/tasks/${taskId}/move`, {
          status: "in_progress",
          position: 0,
        });

        return {
          content: [
            {
              type: "text",
              text: `Claimed task: "${task.title}" - now in progress`,
            },
          ],
        };
      }

      case "kanban_update_activity": {
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

      case "kanban_set_blocked": {
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

      case "kanban_wait_for_reply": {
        const taskId = args?.taskId as string;

        try {
          const response = await fetch(
            `${KANBAN_URL}/api/comments/task/${taskId}/wait-for-reply`
          );

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

      case "kanban_complete_task": {
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

      case "kanban_check_comments": {
        const taskId = args?.taskId as string;
        const since = args?.since as string | undefined;

        const url = since
          ? `/api/comments/task/${taskId}?since=${encodeURIComponent(since)}`
          : `/api/comments/task/${taskId}`;

        interface Comment {
          id: string;
          task_id: string;
          author: string;
          content: string;
          seen: boolean;
          created_at: string;
        }

        const comments = await httpGet<Comment[]>(url);
        const userComments = comments.filter((c) => c.author === "user");
        const unseenComments = userComments.filter((c) => !c.seen);

        if (unseenComments.length > 0) {
          await httpPatch(`/api/comments/task/${taskId}/mark-seen`, {});
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

      case "kanban_add_comment": {
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

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

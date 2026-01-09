import { httpGet } from "../http.ts";
import type { ToolResult } from "./index.ts";
import type { Project } from "./tasks.ts";

export async function handleWatch(args: Record<string, unknown>): Promise<ToolResult> {
  const projectId = args?.projectId as string;
  const project = await httpGet<Project>(`/api/projects/${projectId}?heartbeat=true`);

  const pausedWarning = project.paused
    ? `\n\n⚠️ WARNING: This project is currently PAUSED. Claude will not pick up new tasks until resumed. The user can click "Resume" in the task queue UI to allow task processing.`
    : "";

  return {
    content: [
      {
        type: "text",
        text: `Connected to project "${project.name}" (${project.id}).${pausedWarning}

You are now watching this task queue. Follow this loop:
1. Call queue_get_tasks with status "ready" to find available tasks
2. If found, call queue_claim_task to start working
3. Update queue_update_activity periodically as you work
4. If you need user input, call queue_set_blocked with your question
5. Call queue_wait_for_reply to wait for user response
6. When done, call queue_complete_task
7. Auto-commit changes: git add -A && git commit -m "task: {title}"
8. Repeat from step 1

If a task is deleted while you're working on it, run: git reset --hard HEAD
If queue_wait_for_reply returns { deleted: true }, discard changes and pick the next task.`,
      },
    ],
  };
}

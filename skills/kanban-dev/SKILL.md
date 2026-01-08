---
name: kanban-dev
description: Watch the kanban board on the development server (port 3334) and work through tasks autonomously. Use this when starting a coding session with the dev kanban board.
---

# Kanban Board Watcher (Development)

Watch the kanban board on the DEVELOPMENT server (port 3334) and work through tasks autonomously.

## Setup

1. Call `kanban_watch` with the project ID to connect to the board
2. The project ID is in the format `kbn-xxxx` (check the URL or run `claude-kanban list`)

## Main Loop

Repeat continuously:

1. **Check for tasks**: Call `kanban_get_tasks` with status "ready"
2. **If no ready tasks**:
   - Poll every 30 seconds for up to 3 minutes (6 polls)
   - If still no tasks after 3 minutes, inform user and stop
3. **Get current commit**: Run `git rev-parse HEAD` to get the current commit hash
4. **Claim a task**: Call `kanban_claim_task` with the task ID AND the starting_commit from step 3. This stores the commit in the database so it can be used for reset/cancel even across sessions.
5. **Read existing comments**: Call `kanban_check_comments` to see any context or instructions the user may have already added
6. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `kanban_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
7. **If blocked**:
   - Call `kanban_set_blocked` with your question
   - Call `kanban_wait_for_reply` to wait for response
   - If `{ "deleted": true }`, run `git reset --hard <starting_commit>` (the commit you passed in step 4) and go to step 1
   - If `{ "timeout": true }`, call `kanban_wait_for_reply` again
8. **Final check**: Before completing, call `kanban_check_comments` one last time to ensure no new feedback was left during your work
9. **Add summary** (REQUIRED): ALWAYS add a completion summary using `kanban_add_comment` before completing. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
10. **Complete**: Call `kanban_complete_task`, then commit changes
11. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working, discard all changes including commits with `git reset --hard <starting_commit>` (use the commit hash you passed when claiming)
- Always commit after completing a task
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- `[ACTION:RESET]` - User wants to reset all changes. Run `git reset --hard <starting_commit>` to undo all changes including commits, then start the task fresh from the beginning.
- `[ACTION:CANCEL]` - User wants to cancel the task. Run `git reset --hard <starting_commit>` to undo all changes including commits, then move the task to backlog status using the move API.

**Note**: The `starting_commit` is stored in the task when you claim it (step 4). For in-progress tasks, it's also returned by `kanban_get_tasks` in the task's `starting_commit` field.

## Note

This uses the DEV MCP server (claude-kanban-dev) on port 3334.
Make sure `make dev` is running.

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

Repeat continuously until no more ready tasks:

1. **Check for tasks**: Call `kanban_get_tasks` with status "ready"
2. **Claim a task**: Call `kanban_claim_task` to move it to in_progress
3. **Read existing comments**: Call `kanban_check_comments` to see any context or instructions the user may have already added
4. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `kanban_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
5. **If blocked**:
   - Call `kanban_set_blocked` with your question
   - Call `kanban_wait_for_reply` to wait for response
   - If `{ "deleted": true }`, run `git reset --hard HEAD` and go to step 1
   - If `{ "timeout": true }`, call `kanban_wait_for_reply` again
6. **Final check**: Before completing, call `kanban_check_comments` one last time to ensure no new feedback was left during your work
7. **Add summary** (REQUIRED): ALWAYS add a completion summary using `kanban_add_comment` before completing. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
8. **Complete**: Call `kanban_complete_task`, then commit changes
9. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working, discard changes with `git reset --hard HEAD`
- Always commit after completing a task
- If no ready tasks, inform user and stop
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Paused State

If `kanban_watch` or `kanban_get_tasks` indicates the project is paused:
- The user has intentionally paused task processing
- Do NOT attempt to pick up new tasks
- Inform the user that the project is paused and they need to click "Resume" in the kanban board UI
- Wait for them to resume before continuing the task loop

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- `[ACTION:RESET]` - User wants to reset all changes. Run `git reset --hard HEAD` and start the task fresh from the beginning.
- `[ACTION:CANCEL]` - User wants to cancel the task. Run `git reset --hard HEAD` and move the task to backlog status using the move API.

## Note

This uses the DEV MCP server (claude-kanban-dev) on port 3334.
Make sure `make dev` is running.

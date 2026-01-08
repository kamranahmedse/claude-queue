---
name: kanban
description: Watch the kanban board and work through tasks autonomously. Use this when starting a coding session with the kanban board.
---

# Kanban Board Watcher

Watch the kanban board and work through tasks autonomously.

## Setup

1. Call `kanban_watch` with the project ID to connect to the board
2. The project ID is in the format `kbn-xxxx` (check the URL or run `claude-kanban list`)

## Main Loop

Repeat continuously:

1. **Check for tasks**: Call `kanban_get_tasks` with status "ready"
2. **If no ready tasks**:
   - Poll every 30 seconds for up to 3 minutes (6 polls)
   - If still no tasks after 3 minutes, inform user and stop
3. **Claim a task**: Call `kanban_claim_task` to move it to in_progress
4. **Read existing comments**: Call `kanban_check_comments` to see any context or instructions the user may have already added
5. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `kanban_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
6. **If blocked**:
   - Call `kanban_set_blocked` with your question
   - Call `kanban_wait_for_reply` to wait for response
   - If `{ "deleted": true }`, run `git reset --hard HEAD` and go to step 1
   - If `{ "timeout": true }`, call `kanban_wait_for_reply` again
7. **Final check**: Before completing, call `kanban_check_comments` one last time to ensure no new feedback was left during your work
8. **Add summary** (REQUIRED): ALWAYS add a completion summary using `kanban_add_comment` before completing. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
9. **Complete**: Call `kanban_complete_task`, then commit changes
10. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working, discard changes with `git reset --hard HEAD`
- Always commit after completing a task
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- `[ACTION:RESET]` - User wants to reset all changes. Run `git reset --hard HEAD` and start the task fresh from the beginning.
- `[ACTION:CANCEL]` - User wants to cancel the task. Run `git reset --hard HEAD` and move the task to backlog status using the move API.

## Note

This uses the production MCP server (claude-kanban) on port 3333.
Make sure the kanban server is running (`npx claude-kanban` or `make start`).

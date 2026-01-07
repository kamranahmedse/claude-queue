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

Repeat continuously until no more ready tasks:

1. **Check for tasks**: Call `kanban_get_tasks` with status "ready"
2. **Claim a task**: Call `kanban_claim_task` to move it to in_progress
3. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `kanban_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
4. **If blocked**:
   - Call `kanban_set_blocked` with your question
   - Call `kanban_wait_for_reply` to wait for response
   - If `{ "deleted": true }`, run `git reset --hard HEAD` and go to step 1
   - If `{ "timeout": true }`, call `kanban_wait_for_reply` again
5. **Complete**: Call `kanban_complete_task`, then commit changes
6. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working, discard changes with `git reset --hard HEAD`
- Always commit after completing a task
- If no ready tasks, inform user and stop

## Note

This uses the production MCP server (claude-kanban) on port 3333.
Make sure the kanban server is running (`npx claude-kanban` or `make start`).

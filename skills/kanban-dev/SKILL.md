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
3. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
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

This uses the DEV MCP server (claude-kanban-dev) on port 3334.
Make sure `make dev` is running.

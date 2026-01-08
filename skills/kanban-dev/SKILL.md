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
3. **Check if git repo**: Run `git rev-parse --is-inside-work-tree 2>/dev/null` to check if you're in a git repository
   - If the command returns "true", this is a git repo - proceed to get the commit hash
   - If the command fails or returns nothing, this is NOT a git repo - skip git operations throughout
4. **Get current commit** (git repos only): Run `git rev-parse HEAD` to get the current commit hash
5. **Claim a task**: Call `kanban_claim_task` with the task ID AND the starting_commit from step 4 (use empty string "" if not a git repo). This stores the commit in the database so it can be used for reset/cancel even across sessions.
6. **Read existing comments**: Call `kanban_check_comments` to see any context or instructions the user may have already added
7. **Work on the task**:
   - Update activity with `kanban_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `kanban_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
8. **If blocked**:
   - Call `kanban_set_blocked` with your question
   - Call `kanban_wait_for_reply` to wait for response
   - If `{ "deleted": true }` and this is a git repo, run `git reset --hard <starting_commit>` (the commit you passed in step 5) and go to step 1
   - If `{ "deleted": true }` and NOT a git repo, just go to step 1 (changes cannot be auto-reverted)
   - If `{ "timeout": true }`, call `kanban_wait_for_reply` again
9. **Final check**: Before completing, call `kanban_check_comments` one last time to ensure no new feedback was left during your work
10. **Add summary** (REQUIRED): ALWAYS add a completion summary using `kanban_add_comment` before completing. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
11. **Complete**: Call `kanban_complete_task`, then commit changes (git repos only)
12. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working and this is a git repo, discard all changes including commits with `git reset --hard <starting_commit>` (use the commit hash you passed when claiming)
- Commit after completing a task (git repos only)
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Non-Git Directories

This skill works for both git repositories and non-git directories:
- **Git repos**: Full functionality including commits and the ability to reset/cancel changes
- **Non-git directories**: All kanban features work, but without commits or change tracking
- When not in a git repo, skip all git commands (`git rev-parse`, `git reset`, `git add`, `git commit`, etc.)

## Planning/Discussion Tasks

Some tasks are not direct implementation requests but rather planning, discussion, or feedback requests. Examples:
- "What do you think about X approach?"
- "Can you plan how to implement Y?"
- "Should we use A or B for this feature?"
- "Review and suggest improvements for Z"
- Tasks asking for your opinion, recommendation, or analysis

For these tasks:
1. **Don't complete immediately** - Don't just provide your answer and move to Done
2. **Mark as blocked**: After providing your analysis/plan/recommendation, call `kanban_set_blocked` with something like "Waiting for your feedback on the proposed approach"
3. **Wait for reply**: Call `kanban_wait_for_reply` to let the user respond
4. **Then complete**: Once user confirms or provides direction, complete the task

This ensures the user gets a chance to review and respond to your suggestions before the task is considered done.

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- `[ACTION:RESET]` - User wants to reset all changes. If in a git repo, run `git reset --hard <starting_commit>` to undo all changes including commits, then start the task fresh from the beginning. If not in a git repo, just start fresh (previous changes cannot be auto-reverted).
- `[ACTION:CANCEL]` - User wants to cancel the task. If in a git repo, run `git reset --hard <starting_commit>` to undo all changes including commits. Then move the task to backlog status using the move API. If not in a git repo, just move to backlog (changes cannot be auto-reverted).

**Note**: The `starting_commit` is stored in the task when you claim it (step 5). For in-progress tasks, it's also returned by `kanban_get_tasks` in the task's `starting_commit` field. This will be empty for non-git directories.

## Note

This uses the DEV MCP server (claude-kanban-dev) on port 3334.
Make sure `make dev` is running.

---
name: queue
description: Watch the queue board and work through tasks autonomously. Use this when starting a coding session with the queue board.
---

# Queue Board

**MCP Server:** Use the `claude-queue` MCP server for all queue tools in this skill.

Work through tasks or plan new ones for a queue board.

## Argument Validation

FIRST, check the arguments passed to this skill:

1. **If no arguments provided** (just `/queue` with nothing after):
   - Call `queue_list_projects` to get available projects
   - Display the result to the user and stop

2. **If arguments start with `plan`** but no project ID after it (just `/queue plan`):
   - Call `queue_list_projects` to get available projects
   - Display: "Missing project ID. Available projects:" followed by the list
   - Stop

3. **If a project ID is provided**, proceed to Mode Detection below. If `queue_watch` fails with a "not found" error:
   - Call `queue_list_projects` to get available projects
   - Display: "Project not found. Available projects:" followed by the list
   - Stop

---

## Mode Detection

Check the arguments passed to this skill:
- If arguments start with `plan` (e.g., `/queue plan kbn-xxxx`), follow **Planning Mode** below
- Otherwise (e.g., `/queue kbn-xxxx`), follow **Work Mode** (Main Loop) below

---

## Planning Mode

When invoked with `/queue plan <project-id>`:

1. **Connect**: Call `queue_watch` with the project ID (ignore the "watching" message - that's for work mode)
2. **Start discovery**: Immediately ask the user an open-ended question about what they're planning to work on. Let them explain freely.
3. **Gather context**: After the user replies, read the project's CLAUDE.md file if it exists (at the project path) to understand any existing context
4. **Iterative refinement**: Use the AskUserQuestion tool to ask targeted follow-up questions based on their initial response and any existing context. Keep asking until you have a clear understanding of:
   - What they want to accomplish
   - The scope and constraints
   - What success looks like
   - Any preferences or requirements
5. **Propose the plan**: Present a comprehensive plan document capturing everything discussed. Ask if it captures their intent correctly.
6. **Refine until approved**: If the user wants changes, refine the plan. Repeat until they're happy.
7. **Create/update CLAUDE.md**: Once approved, write the plan to CLAUDE.md in the project directory. This provides context for all future sessions.
8. **Set project prompt**: Call `queue_set_project_prompt` with a brief 1-2 sentence summary of what the project is about
9. **Break into tasks**: Create focused, actionable tasks:
   - Avoid overly broad tasks - each should be completable in a single session
   - Include enough context in descriptions so the task can be understood without CLAUDE.md
   - Mention relevant files or components when helpful
   - **Every 7 tasks**, insert a task titled "Optimize CLAUDE.md" with this description: "Review and optimize the CLAUDE.md file to keep it concise and relevant. As implementation progresses, some planned sections become outdated or redundant. Keeping CLAUDE.md lean ensures Claude reads the most important context without hitting token limits, improving response quality and reducing confusion from stale information."
10. **Ready to start?**: Ask "Ready to start? (or should I just add these to backlog for later?)"
   - If user wants to start: Create tasks in "ready", then proceed to **Work Mode** and begin the main loop
   - If user wants backlog: Create tasks in "backlog", inform them they can start later by running `/queue <project-id>`

---

## Work Mode

Work through tasks autonomously.

## Setup

1. Call `queue_watch` with the project ID to connect to the board
2. The project ID is in the format `kbn-xxxx` (check the URL or run `claude-queue list`)

## Main Loop

Repeat continuously:

1. **Check for in-progress tasks first**: Call `queue_get_tasks` with status "in_progress"
   - If there's already an in-progress task, this means you were previously working on it (possibly before context compression/summarization)
   - Resume working on that task from step 6 (don't claim it again - it's already claimed)
   - The task's `starting_commit` field contains the commit hash from when it was claimed
2. **Check for ready tasks**: If no in-progress tasks, call `queue_get_tasks` with status "ready"
3. **If no ready tasks**:
   - Poll every 30 seconds for up to 3 minutes (6 polls)
   - If still no tasks after 3 minutes, inform user and stop
4. **Claim task immediately**: When a ready task is found, IMMEDIATELY claim it to prevent the user from making changes while you prepare:
   - Run `git rev-parse --is-inside-work-tree 2>/dev/null && git rev-parse HEAD` in a single command to check if git repo and get commit hash
   - Call `queue_claim_task` with the task ID AND the starting_commit (use empty string "" if not a git repo)
   - This moves the task to in_progress right away so user sees it's being worked on
5. **Read existing comments**: Call `queue_check_comments` to see any context or instructions the user may have already added
6. **Work on the task**:
   - Update activity with `queue_update_activity` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call `queue_check_comments` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
7. **If blocked**:
   - Call `queue_set_blocked` with your question
   - Call `queue_wait_for_reply` to wait for response
   - If `{ "deleted": true }` and this is a git repo, run `git reset --hard <starting_commit>` (the commit from step 4 or from the task's `starting_commit` field) and go to step 1
   - If `{ "deleted": true }` and NOT a git repo, just go to step 1 (changes cannot be auto-reverted)
   - If `{ "timeout": true }`, call `queue_wait_for_reply` again
8. **Final check**: Before completing, call `queue_check_comments` one last time to ensure no new feedback was left during your work
9. **Commit** (git repos only): Commit changes before marking the task as complete
10. **Add summary** (REQUIRED): ALWAYS add a completion summary using `queue_add_comment` BEFORE calling complete. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
11. **Complete**: Call `queue_complete_task` to move the task to Done (the comment from step 10 must already be added)
12. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working and this is a git repo, discard all changes including commits with `git reset --hard <starting_commit>` (use the commit hash you passed when claiming)
- Commit before completing a task (git repos only), not after
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Non-Git Directories

This skill works for both git repositories and non-git directories:
- **Git repos**: Full functionality including commits and the ability to reset/cancel changes
- **Non-git directories**: All queue features work, but without commits or change tracking
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
2. **Mark as blocked**: After providing your analysis/plan/recommendation, call `queue_set_blocked` with something like "Waiting for your feedback on the proposed approach"
3. **Wait for reply**: Call `queue_wait_for_reply` to let the user respond
4. **Then complete**: Once user confirms or provides direction, complete the task

This ensures the user gets a chance to review and respond to your suggestions before the task is considered done.

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- `[ACTION:RESET]` - User wants to reset all changes. If in a git repo, run `git reset --hard <starting_commit>` to undo all changes including commits, then start the task fresh from the beginning. If not in a git repo, just start fresh (previous changes cannot be auto-reverted).
- `[ACTION:CANCEL]` - User wants to cancel the task. If in a git repo, run `git reset --hard <starting_commit>` to undo all changes including commits. Then call `queue_move_task` with status "backlog" to move the task to backlog. If not in a git repo, just call `queue_move_task` to move to backlog (changes cannot be auto-reverted).

**Note**: The `starting_commit` is stored in the task when you claim it (step 4). For in-progress tasks, it's also returned by `queue_get_tasks` in the task's `starting_commit` field. This will be empty for non-git directories.

## Note

This uses the production MCP server (claude-queue) on port 3333.
Make sure the queue server is running (`npx claude-queue` or `make start`).

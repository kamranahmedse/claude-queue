# claude-queue

A local queue board for managing Claude Code projects. Add tasks to the board, and Claude will pick them up, work through them autonomously, ask questions when blocked, and mark them complete.

![](./.github/demo.png)

## Quick Start

```bash
cd /path/to/your/project
npx claude-queue
```

This starts the queue server and opens your board at `http://localhost:3333` with the empty project board.

> On every run, it automatically updates the `/queue` skill and MCP configuration. **Restart Claude Code after first run** to load the MCP server.

Get the project ID/command from the top right of the web UI (e.g. `kbn-xxxx`). Then in Claude Code run:

```
/queue <project-id>
```

Claude will start watching your board and work through tasks in the Ready column.

## How It Works

1. **Add tasks** to the Ready column in the web UI
2. **Run `/queue`** in Claude Code
3. **Claude picks up tasks**, moves them to In Progress, and works on them
4. **If blocked**, Claude asks a question—reply in the UI
5. **When done**, Claude commits changes and moves the task to Done
6. **Repeat** until no more Ready tasks

## Planning Mode

Instead of manually adding tasks, you can describe a feature and let Claude break it down into tasks:

```
/queue plan <project-id>
```

Claude will guide you through:
- Ask what you'd like to plan
- Propose a task breakdown based on your description
- Let you refine the tasks
- Ask whether to add them to Ready (default) or Backlog
- Create all tasks automatically

## Features

- **Sound notifications** — Audio alerts when tasks start, complete, or need attention (toggleable)
- **Keyboard shortcuts** — Press `?` to see all shortcuts (`N` to add task, `S` for stats, etc.)
- **Statistics** — Track completed tasks, time spent, and productivity metrics
- **Drag & drop** — Reorder tasks between columns

## CLI Commands

```bash
claude-queue              # Start server (foreground)
claude-queue --detach     # Start server (background)
claude-queue status       # Check if server is running
claude-queue stop         # Stop the server
claude-queue restart      # Restart the server
claude-queue list         # List all projects
claude-queue doctor       # Diagnose and fix issues
claude-queue upgrade      # Upgrade to latest version
claude-queue uninstall    # Remove MCP and skill config
claude-queue uninstall --all  # Also remove all data
```

## Upgrading

To upgrade to the latest version:

```bash
npx claude-queue upgrade
```

This updates the npm package, reinstalls the `/queue` skill with the latest version, and refreshes the MCP configuration. Restart Claude Code after upgrading.

## Uninstalling

To remove claude-queue from Claude Code:

```bash
npx claude-queue uninstall
```

This removes the MCP server config from `~/.claude/settings.json` and the `/queue` skill. Restart Claude Code after uninstalling.

To also remove all data (database, logs):

```bash
npx claude-queue uninstall --all
```

## Status Indicators

| Status           | Meaning                                            |
|------------------|----------------------------------------------------|
| **Start Claude** | Claude not running—run `/queue` to start           |
| **Working**      | Claude is working on a task                        |
| **Blocked**      | Claude needs your response—click the task to reply |
| **Watching**     | Claude is connected and waiting for tasks          |

## Interacting with Tasks

**Comments** — Add comments to any task. Claude checks for new comments periodically while working and will respond to feedback or new instructions.

**Abort Task** — Click the task menu to abort. This discards uncommitted changes (via git reset) and moves the task back to Backlog.

**Start Over** — Restarts the current task from scratch, discarding uncommitted changes but keeping the task in progress.

**Git Integration** — When Claude completes a task in a git repository, it commits the changes automatically. The starting commit is recorded when work begins, allowing clean rollback if you abort.

## Data Storage

All data is stored locally:
- Database: `~/.claude-queue/queue.db`
- Logs: `~/.claude-queue/server.log`

## Development

```bash
git clone https://github.com/kamranahmedse/claude-queue.git
cd claude-queue
make setup    # Install deps, build, configure MCP
make dev      # Start dev server with hot reload
```

Use `/queue-dev` in Claude Code to connect to the dev server (port 3334).

## License

MIT © Kamran Ahmed

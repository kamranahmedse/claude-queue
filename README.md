# claude-kanban

A local kanban board for managing Claude Code projects. Add tasks to the board, and Claude will pick them up, work through them autonomously, ask questions when blocked, and mark them complete.

## Quick Start

Navigate to your project directory and run:

```bash
npx claude-kanban
```

This starts the kanban server and opens your board at `http://localhost:3333` with the empty project board.

> On first run, it automatically configures the MCP server and installs the `/kanban` skill. **Restart Claude Code after first run** to load the MCP server.

Get the project ID/command from the top right of the web UI (e.g. `kbn-xxxx`). Then in Claude Code run:

```
/kanban <project-id>
```

Claude will start watching your board and work through tasks in the Ready column.

## How It Works

1. **Add tasks** to the Ready column in the web UI
2. **Run `/kanban`** in Claude Code
3. **Claude picks up tasks**, moves them to In Progress, and works on them
4. **If blocked**, Claude asks a question—reply in the UI
5. **When done**, Claude commits changes and moves the task to Done
6. **Repeat** until no more Ready tasks

## Features

- **Sound notifications** — Audio alerts when tasks start, complete, or need attention (toggleable)
- **Keyboard shortcuts** — Press `?` to see all shortcuts (`N` to add task, `S` for stats, etc.)
- **Statistics** — Track completed tasks, time spent, and productivity metrics
- **Drag & drop** — Reorder tasks between columns

## CLI Commands

```bash
claude-kanban              # Start server (foreground)
claude-kanban --detach     # Start server (background)
claude-kanban status       # Check if server is running
claude-kanban stop         # Stop background server
claude-kanban list         # List all projects
claude-kanban doctor       # Diagnose and fix issues
claude-kanban uninstall    # Remove MCP and skill config
claude-kanban uninstall --all  # Also remove all data
```

## Upgrading

The MCP server uses `npx -y` which automatically fetches the latest version. To upgrade:

1. Stop the running server: `claude-kanban stop`
2. Clear npm cache (optional): `npm cache clean --force`
3. Start again: `npx claude-kanban`

The skill file at `~/.claude/skills/kanban/` is only written once. To update it, delete the folder and restart:

```bash
rm -rf ~/.claude/skills/kanban
npx claude-kanban
```

## Uninstalling

To remove claude-kanban from Claude Code:

```bash
npx claude-kanban uninstall
```

This removes the MCP server config from `~/.claude/settings.json` and the `/kanban` skill. Restart Claude Code after uninstalling.

To also remove all data (database, logs):

```bash
npx claude-kanban uninstall --all
```

## Status Indicators

| Status | Meaning |
|--------|---------|
| **Start Claude** | Claude not running—run `/kanban` to start |
| **Working** | Claude is working on a task |
| **Blocked** | Claude needs your response—click the task to reply |
| **Watching** | Claude is connected and waiting for tasks |

## Interacting with Tasks

**Comments** — Add comments to any task. Claude checks for new comments periodically while working and will respond to feedback or new instructions.

**Abort Task** — Click the task menu to abort. This discards uncommitted changes (via git reset) and moves the task back to Backlog.

**Start Over** — Restarts the current task from scratch, discarding uncommitted changes but keeping the task in progress.

**Git Integration** — When Claude completes a task in a git repository, it commits the changes automatically. The starting commit is recorded when work begins, allowing clean rollback if you abort.

## Data Storage

All data is stored locally:
- Database: `~/.claude-kanban/kanban.db`
- Logs: `~/.claude-kanban/server.log`

## Development

```bash
git clone https://github.com/kamranahmedse/claude-kanban.git
cd claude-kanban
make setup    # Install deps, build, configure MCP
make dev      # Start dev server with hot reload
```

Use `/kanban-dev` in Claude Code to connect to the dev server (port 3334).

## License

MIT

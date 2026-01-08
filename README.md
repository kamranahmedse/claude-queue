# claude-kanban

A local kanban board for managing Claude Code projects with MCP integration.

## Overview

claude-kanban lets you create task boards for your projects that Claude can watch and work from autonomously. Add tasks to the board, and Claude will pick them up, update progress, ask questions when blocked, and mark them complete.

## Quick Start

Just run this command in your project directory:

```bash
npx claude-kanban
```

That's it! On first run, this automatically:
- Starts the kanban server on port 3333
- Registers your project on the board
- Configures the MCP server in `~/.claude/settings.json`
- Installs the `/kanban` skill to `~/.claude/skills/`

You'll see output like:
```
✓ Configured MCP server in ~/.claude/settings.json
✓ Installed /kanban skill to ~/.claude/skills/kanban/
Kanban board: http://localhost:3333?project=kbn-xxxx
```

**Note:** After the first run, restart Claude Code to load the new MCP server.

Then in Claude Code, run:

```
/kanban kbn-xxxx
```

Claude will start watching your board and autonomously work through tasks.

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- fswatch (optional, for `make watch-skills`)

### Quick Setup

```bash
git clone <repo-url>
cd claude-kanban
make setup-dev
```

This installs dependencies, builds packages, installs skills, and configures the dev MCP server.

### Run Development Mode

```bash
make dev
```

This starts:
- **Server** on `http://localhost:3334` (dev port)
- **UI dev server** on `http://localhost:5173` (hot reload, proxies to API)

Use `/kanban-dev` in Claude Code to connect to the dev server.

### Makefile Commands

```bash
make help            # Show all commands

# Setup
make install         # Install dependencies
make build           # Build all packages
make setup           # Full production setup
make setup-dev       # Full development setup
make clean           # Clean node_modules and dist

# Development
make dev             # Start dev server (3334) + UI
make dev-server      # Start only server with hot reload
make dev-ui          # Start only UI dev server

# Production
make start           # Start production server (3333)

# Skills
make generate-skills # Generate SKILL.md from template
make install-skills  # Generate and copy skills to ~/.claude/skills/
make watch-skills    # Auto-regenerate and copy skills on file change

# MCP
make install-mcp     # Configure production MCP (port 3333)
make install-mcp-dev # Configure dev MCP (port 3334)
make uninstall-mcp   # Remove MCP configs

# Testing
make typecheck       # Run TypeScript checks
make test-api        # Test API endpoints
make logs            # View server logs

# Publishing (maintainers only)
make build-package   # Build npm package
make publish-dry-run # Test publish without actually publishing
make publish         # Publish to npm
```

### Ports

| Environment | Server Port | UI Dev Port | Skill         |
|-------------|-------------|-------------|---------------|
| Development | 3334        | 5173        | `/kanban-dev` |
| Production  | 3333        | -           | `/kanban`     |

### Project Structure

```
claude-kanban/
├── packages/
│   ├── server/     # Express + SQLite API
│   ├── ui/         # React + Vite + TailwindCSS
│   ├── mcp/        # MCP server for Claude integration
│   └── cli/        # CLI entry point (npx claude-kanban)
├── skills/
│   ├── SKILL.template.md  # Template for generating skills
│   ├── generate-skills.ts # Script to generate from template
│   ├── kanban/            # Production skill
│   └── kanban-dev/        # Development skill
├── pnpm-workspace.yaml
└── tsconfig.json
```

## CLI Commands

### Start Server

```bash
# Start in foreground (default)
claude-kanban

# Start in background
claude-kanban --detach

# Custom port
claude-kanban --port 4000

# Verbose output
claude-kanban --verbose
```

### Manage Projects

```bash
# List all projects
claude-kanban list

# Delete a project
claude-kanban delete kbn-xxxx
```

### Server Management

```bash
# Check server status
claude-kanban status

# Stop background server
claude-kanban stop

# View logs
claude-kanban logs

# Follow logs
claude-kanban logs -f
```

## Using with Claude Code

### 1. Start the Board

```bash
cd /path/to/your/project
npx claude-kanban
```

### 2. Add Tasks

Open `http://localhost:3333` in your browser and add tasks to the **Ready** column.

### 3. Start Claude Watching

In Claude Code, run:

```
/kanban
```

Claude will:
1. Connect to your project's board
2. Pick up tasks from the Ready column
3. Move them to In Progress
4. Update activity as it works
5. Ask questions if blocked (you reply in the UI)
6. Complete tasks and auto-commit changes
7. Repeat until no more Ready tasks

## Claude Status Indicator

The UI shows Claude's connection status in the header. The status is based on **heartbeat tracking** - Claude sends a heartbeat every time it checks for tasks, so the UI knows if Claude is actively watching.

| Status           | Icon      | Meaning                                                       |
|------------------|-----------|---------------------------------------------------------------|
| **Start Claude** | ⚠️ Yellow | Claude is not running. Run `/kanban <project-id>` to start.   |
| **Working**      | 🔄 Green  | Claude is actively working on a task.                         |
| **Blocked**      | 🔴 Red    | Claude is waiting for your response. Click the task to reply. |
| **Ready**        | 🔵 Blue   | Claude is connected and tasks are waiting to be picked up.    |
| **Watching**     | 🟢 Green  | Claude is connected and watching for new tasks.               |
| **Paused**       | ⏸️ Gray   | You've paused Claude. Click Resume to continue.               |

### Pause After Task / Resume

Use the **Pause After Task** button to prevent Claude from picking up new tasks after completing the current one. This is useful when you want to:
- Review Claude's work before it continues
- Make manual changes without Claude interfering
- Take a break from autonomous task processing

The button only appears when Claude is connected. If Claude isn't running, there's nothing to pause.

When paused:
- Claude will finish any task currently in progress
- Claude will not pick up new tasks from the Ready column
- Click **Resume** to allow Claude to continue

## Skills

The `/kanban` skill is automatically installed when you run `npx claude-kanban` for the first time. No manual setup required!

Available skills:
- `/kanban` - Connect to production server (port 3333)
- `/kanban-dev` - Connect to development server (port 3334, for local development)

### For Development

If you're developing claude-kanban locally, you can manually manage skills:

```bash
make generate-skills  # Regenerate skills from template
make install-skills   # Generate and copy skills to ~/.claude/skills/
make watch-skills     # Auto-regenerate and copy on file change (requires fswatch)
```

Skills are generated from a single template (`skills/SKILL.template.md`) using variable substitution. This ensures both the production (`/kanban`) and development (`/kanban-dev`) skills stay in sync.

## MCP Configuration

The MCP server is automatically configured when you run `npx claude-kanban` for the first time. It adds to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "claude-kanban": {
      "command": "npx",
      "args": ["-y", "-p", "claude-kanban", "claude-kanban-mcp"],
      "env": {
        "KANBAN_SERVER_URL": "http://localhost:3333"
      }
    }
  }
}
```

**After the first run, restart Claude Code** to load the new MCP server.

### For Development

If you're developing claude-kanban locally, configure the dev MCP server:

```bash
make install-mcp-dev  # Configure dev MCP (port 3334)
make install-mcp      # Configure production MCP (port 3333)
make uninstall-mcp    # Remove MCP configs
```

### MCP Tools (used internally by /kanban skill)

| Tool | Description |
|------|-------------|
| `kanban_watch` | Connect to a project board (sends heartbeat, warns if paused) |
| `kanban_get_tasks` | List tasks, optionally by status (sends heartbeat, returns paused status) |
| `kanban_claim_task` | Move a task to in_progress |
| `kanban_update_activity` | Update current activity on a task |
| `kanban_set_blocked` | Mark task blocked and ask a question |
| `kanban_wait_for_reply` | Wait for user to reply to question |
| `kanban_complete_task` | Move task to done |
| `kanban_check_comments` | Check for new user comments on a task |
| `kanban_add_comment` | Add a comment to a task |

**Heartbeat**: The `kanban_watch` and `kanban_get_tasks` tools automatically send a heartbeat to the server, which updates the `claude_last_seen` timestamp. The UI uses this to determine if Claude is actively connected (within the last 30 seconds).

## Board Columns

| Column | Description |
|--------|-------------|
| **Backlog** | Ideas and future tasks |
| **Ready** | Tasks ready for Claude to pick up |
| **In Progress** | Task currently being worked on |
| **Done** | Completed tasks |

## Data Storage

- Database: `~/.claude-kanban/kanban.db` (SQLite)
- Logs: `~/.claude-kanban/server.log`
- PID file: `~/.claude-kanban/server.pid`

## API Endpoints

### Projects

- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project by ID (add `?heartbeat=true` to update Claude's last seen timestamp)
- `POST /api/projects` - Create project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/pause` - Pause project (prevent Claude from picking up tasks)
- `POST /api/projects/:id/resume` - Resume project (allow Claude to pick up tasks)
- `POST /api/projects/:id/heartbeat` - Update Claude's last seen timestamp

### Tasks

- `GET /api/tasks/project/:projectId` - List tasks (optional `?status=` filter)
- `GET /api/tasks/:id` - Get task with comments
- `POST /api/tasks/project/:projectId` - Create task
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/move` - Move task (change status/position)
- `DELETE /api/tasks/:id` - Delete task

### Comments

- `GET /api/comments/task/:taskId` - List comments
- `POST /api/comments/task/:taskId` - Add comment
- `GET /api/comments/task/:taskId/wait-for-reply` - Long-poll for user reply

### Health

- `GET /api/health` - Server status and stats

## Publishing to npm

The project is published as a single npm package called `claude-kanban`. To publish a new version:

### Prerequisites

1. Login to npm: `npm login`
2. Ensure you have publish rights to the `claude-kanban` package

### Publishing Steps

```bash
# 1. Update version in packages/cli/package.json
# 2. Build and test
make build-package
make publish-dry-run

# 3. Publish
make publish

# 4. Commit and tag the release
git add -A
git commit -m "chore: release v1.x.x"
git tag v1.x.x
git push && git push --tags
```

### Package Contents

The npm package bundles:
- CLI (`claude-kanban` command)
- MCP server (`claude-kanban-mcp` command)
- Express API server
- React UI (pre-built static files)

## License

MIT

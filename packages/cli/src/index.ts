#!/usr/bin/env node
import { program } from "commander";
import { spawn, ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { homedir } from "node:os";

const DEFAULT_PORT = 3333;
const KANBAN_DIR = join(homedir(), ".claude-kanban");
const PID_FILE = join(KANBAN_DIR, "server.pid");
const LOG_FILE = join(KANBAN_DIR, "server.log");
const CLAUDE_DIR = join(homedir(), ".claude");
const SKILLS_DIR = join(CLAUDE_DIR, "skills");

function ensureKanbanDir(): void {
  if (!existsSync(KANBAN_DIR)) {
    mkdirSync(KANBAN_DIR, { recursive: true });
  }
}

function generateProjectId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "kbn-";
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function isServerRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function getRunningPid(): number | null {
  if (!existsSync(PID_FILE)) {
    return null;
  }
  try {
    const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function savePid(pid: number): void {
  ensureKanbanDir();
  writeFileSync(PID_FILE, pid.toString());
}

async function clearPid(): Promise<void> {
  if (existsSync(PID_FILE)) {
    const fs = await import("node:fs/promises");
    await fs.unlink(PID_FILE).catch(() => {});
  }
}

async function configureMcp(): Promise<void> {
  const settingsPath = join(CLAUDE_DIR, "settings.json");

  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      console.log("Warning: Could not parse existing settings.json");
    }
  }

  const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};

  if (!mcpServers["claude-kanban"]) {
    mcpServers["claude-kanban"] = {
      command: "npx",
      args: ["-y", "@claude-kanban/mcp"],
      env: {
        KANBAN_SERVER_URL: `http://localhost:${DEFAULT_PORT}`,
      },
    };
    settings.mcpServers = mcpServers;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log("✓ Configured MCP server in ~/.claude/settings.json");
  }
}

function installSkills(): void {
  const kanbanSkillDir = join(SKILLS_DIR, "kanban");
  const kanbanSkillFile = join(kanbanSkillDir, "SKILL.md");

  if (existsSync(kanbanSkillFile)) {
    return;
  }

  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  }

  if (!existsSync(kanbanSkillDir)) {
    mkdirSync(kanbanSkillDir, { recursive: true });
  }

  const skillContent = `---
name: kanban
description: Watch the kanban board and work through tasks autonomously. Use this when starting a coding session with the kanban board.
---

# Kanban Board Watcher

Watch the kanban board and work through tasks autonomously.

## Setup

1. Call \`kanban_watch\` with the project ID to connect to the board
2. The project ID is in the format \`kbn-xxxx\` (check the URL or run \`claude-kanban list\`)

## Main Loop

Repeat continuously:

1. **Check for tasks**: Call \`kanban_get_tasks\` with status "ready"
2. **If no ready tasks**:
   - Poll every 30 seconds for up to 3 minutes (6 polls)
   - If still no tasks after 3 minutes, inform user and stop
3. **Claim a task**: Call \`kanban_claim_task\` to move it to in_progress
4. **Read existing comments**: Call \`kanban_check_comments\` to see any context or instructions the user may have already added
5. **Work on the task**:
   - Update activity with \`kanban_update_activity\` as you work
   - Do the actual work - write code, fix bugs, etc.
   - **Check for user feedback**: Call \`kanban_check_comments\` periodically (before major steps) to see if user left new comments
   - If there are new comments, read them and accommodate the feedback in your work
6. **If blocked**:
   - Call \`kanban_set_blocked\` with your question
   - Call \`kanban_wait_for_reply\` to wait for response
   - If \`{ "deleted": true }\`, run \`git reset --hard HEAD\` and go to step 1
   - If \`{ "timeout": true }\`, call \`kanban_wait_for_reply\` again
7. **Final check**: Before completing, call \`kanban_check_comments\` one last time to ensure no new feedback was left during your work
8. **Add summary** (REQUIRED): ALWAYS add a completion summary using \`kanban_add_comment\` before completing. Example: "✅ Completed: Added X feature to Y component. Modified files: A.ts, B.tsx. Key changes: implemented Z logic."
9. **Complete**: Call \`kanban_complete_task\`, then commit changes
10. **Repeat** from step 1

## Rules

- Only work on ONE task at a time
- Always update activity so user knows what you're doing
- If task deleted while working, discard changes with \`git reset --hard HEAD\`
- Always commit after completing a task
- If user asks to "defer" or "skip" a task, move it to **backlog** (not ready) so it won't be picked up again automatically

## Action Comments

User can trigger actions via the UI that leave special comments. When checking comments, look for these patterns:

- \`[ACTION:RESET]\` - User wants to reset all changes. Run \`git reset --hard HEAD\` and start the task fresh from the beginning.
- \`[ACTION:CANCEL]\` - User wants to cancel the task. Run \`git reset --hard HEAD\` and move the task to backlog status using the move API.

## Note

This uses the production MCP server (claude-kanban) on port 3333.
Make sure the kanban server is running (\`npx claude-kanban\` or \`make start\`).
`;

  writeFileSync(kanbanSkillFile, skillContent);
  console.log("✓ Installed /kanban skill to ~/.claude/skills/kanban/");
}

async function registerProject(
  port: number,
  projectPath: string,
  verbose: boolean
): Promise<string> {
  const absolutePath = resolve(projectPath);
  const projectName = basename(absolutePath);

  const response = await fetch(`http://localhost:${port}/api/projects`);
  const projects = (await response.json()) as Array<{
    id: string;
    path: string;
  }>;

  const existing = projects.find((p) => p.path === absolutePath);
  if (existing) {
    if (verbose) {
      console.log(`Project already registered: ${existing.id}`);
    }
    return existing.id;
  }

  const createResponse = await fetch(`http://localhost:${port}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: generateProjectId(),
      name: projectName,
      path: absolutePath,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to register project: ${await createResponse.text()}`);
  }

  const project = (await createResponse.json()) as { id: string };
  if (verbose) {
    console.log(`Registered new project: ${project.id}`);
  }
  return project.id;
}

async function startServer(
  port: number,
  detach: boolean,
  verbose: boolean
): Promise<ChildProcess | null> {
  const serverPath = join(
    import.meta.dirname,
    "..",
    "..",
    "server",
    "dist",
    "index.js"
  );

  if (!existsSync(serverPath)) {
    console.error("Server not found. Run pnpm build first.");
    process.exit(1);
  }

  const env = {
    ...process.env,
    PORT: port.toString(),
    NODE_ENV: "production",
  };

  if (detach) {
    ensureKanbanDir();
    const logStream = await import("node:fs").then((fs) =>
      fs.createWriteStream(LOG_FILE, { flags: "a" })
    );

    const child = spawn("node", [serverPath], {
      env,
      detached: true,
      stdio: ["ignore", logStream, logStream],
    });

    child.unref();
    if (child.pid) {
      savePid(child.pid);
    }

    if (verbose) {
      console.log(`Server started in background (PID: ${child.pid})`);
    }

    return null;
  }

  const child = spawn("node", [serverPath], {
    env,
    stdio: verbose ? "inherit" : "pipe",
  });

  return child;
}

async function waitForServer(port: number, maxWait = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await isServerRunning(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

program
  .name("claude-kanban")
  .description("Local kanban board for managing Claude Code projects")
  .version("1.0.0");

program
  .command("start", { isDefault: true })
  .description("Start the kanban server and register current directory as a project")
  .option("-p, --port <port>", "Server port", DEFAULT_PORT.toString())
  .option("-d, --detach", "Run server in background")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    const port = parseInt(options.port);
    const detach = options.detach || false;
    const verbose = options.verbose || false;

    ensureKanbanDir();

    await configureMcp();
    installSkills();

    const running = await isServerRunning(port);

    if (!running) {
      if (verbose) {
        console.log("Starting kanban server...");
      }

      const child = await startServer(port, detach, verbose);

      const serverReady = await waitForServer(port);
      if (!serverReady) {
        console.error("Server failed to start");
        process.exit(1);
      }

      if (child && !detach) {
        const projectId = await registerProject(port, process.cwd(), verbose);
        console.log(`Kanban board: http://localhost:${port}?project=${projectId}`);
        console.log("Press Ctrl+C to stop");

        process.on("SIGINT", () => {
          child.kill();
          process.exit(0);
        });

        await new Promise(() => {});
      }
    } else {
      if (verbose) {
        console.log("Server already running");
      }
    }

    if (running || detach) {
      const projectId = await registerProject(port, process.cwd(), verbose);
      console.log(`Kanban board: http://localhost:${port}?project=${projectId}`);
    }
  });

program
  .command("list")
  .description("List all registered projects")
  .option("-p, --port <port>", "Server port", DEFAULT_PORT.toString())
  .action(async (options) => {
    const port = parseInt(options.port);

    if (!(await isServerRunning(port))) {
      console.error("Server is not running. Start it with: claude-kanban");
      process.exit(1);
    }

    const response = await fetch(`http://localhost:${port}/api/projects`);
    const projects = (await response.json()) as Array<{
      id: string;
      name: string;
      path: string;
    }>;

    if (projects.length === 0) {
      console.log("No projects registered");
      return;
    }

    console.log("Registered projects:");
    for (const project of projects) {
      console.log(`  ${project.id}  ${project.name}`);
      console.log(`           ${project.path}`);
    }
  });

program
  .command("delete <projectId>")
  .description("Delete a project from the kanban")
  .option("-p, --port <port>", "Server port", DEFAULT_PORT.toString())
  .action(async (projectId, options) => {
    const port = parseInt(options.port);

    if (!(await isServerRunning(port))) {
      console.error("Server is not running. Start it with: claude-kanban");
      process.exit(1);
    }

    const response = await fetch(`http://localhost:${port}/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error(`Failed to delete project: ${await response.text()}`);
      process.exit(1);
    }

    console.log(`Deleted project: ${projectId}`);
  });

program
  .command("status")
  .description("Check server status")
  .option("-p, --port <port>", "Server port", DEFAULT_PORT.toString())
  .action(async (options) => {
    const port = parseInt(options.port);

    const running = await isServerRunning(port);
    const pid = getRunningPid();

    if (running) {
      console.log(`Server is running on port ${port}`);
      if (pid) {
        console.log(`PID: ${pid}`);
      }
    } else {
      console.log("Server is not running");
    }
  });

program
  .command("stop")
  .description("Stop the background server")
  .action(async () => {
    const pid = getRunningPid();

    if (!pid) {
      console.log("No background server running");
      return;
    }

    try {
      process.kill(pid, "SIGTERM");
      console.log(`Stopped server (PID: ${pid})`);
      clearPid();
    } catch (error) {
      console.error(`Failed to stop server: ${error}`);
    }
  });

program
  .command("logs")
  .description("View server logs")
  .option("-f, --follow", "Follow log output")
  .option("-n, --lines <lines>", "Number of lines to show", "50")
  .action(async (options) => {
    if (!existsSync(LOG_FILE)) {
      console.log("No logs found");
      return;
    }

    if (options.follow) {
      const { spawn } = await import("node:child_process");
      const tail = spawn("tail", ["-f", LOG_FILE], { stdio: "inherit" });
      process.on("SIGINT", () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      const { spawn } = await import("node:child_process");
      spawn("tail", ["-n", options.lines, LOG_FILE], { stdio: "inherit" });
    }
  });

program
  .command("clean")
  .description("Clean up log files and temporary data")
  .option("--logs", "Remove log files only")
  .option("--all", "Remove all data (logs, database, PID file)")
  .action(async (options) => {
    const fs = await import("node:fs/promises");
    const removed: string[] = [];

    if (options.logs || !options.all) {
      if (existsSync(LOG_FILE)) {
        await fs.unlink(LOG_FILE);
        removed.push("server.log");
      }
    }

    if (options.all) {
      const dbFile = join(KANBAN_DIR, "kanban.db");
      if (existsSync(LOG_FILE)) {
        await fs.unlink(LOG_FILE);
        removed.push("server.log");
      }
      if (existsSync(PID_FILE)) {
        await fs.unlink(PID_FILE);
        removed.push("server.pid");
      }
      if (existsSync(dbFile)) {
        await fs.unlink(dbFile);
        removed.push("kanban.db");
      }
    }

    if (removed.length === 0) {
      console.log("No files to clean");
    } else {
      console.log(`Cleaned: ${removed.join(", ")}`);
    }
  });

program.parse();

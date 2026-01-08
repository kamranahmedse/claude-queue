#!/usr/bin/env node
import { program } from "commander";
import { spawn, ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { homedir } from "node:os";
import { customAlphabet } from "nanoid";

const DEFAULT_PORT = 3333;
const KANBAN_DIR = join(homedir(), ".claude-kanban");
const PID_FILE = join(KANBAN_DIR, "server.pid");
const LOG_FILE = join(KANBAN_DIR, "server.log");
const CLAUDE_DIR = join(homedir(), ".claude");
const SKILLS_DIR = join(CLAUDE_DIR, "skills");

const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

function ensureKanbanDir(): void {
  if (!existsSync(KANBAN_DIR)) {
    mkdirSync(KANBAN_DIR, { recursive: true });
  }
}

function generateProjectId(): string {
  return `kbn-${generateId()}`;
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
      args: ["-y", "-p", "claude-kanban", "claude-kanban-mcp"],
      env: {
        KANBAN_SERVER_URL: `http://localhost:${DEFAULT_PORT}`,
      },
    };
    settings.mcpServers = mcpServers;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log("✓ Configured MCP server in ~/.claude/settings.json");
  }
}

function getSkillPath(): string {
  // When running from npm package: dist/skills/kanban/SKILL.md relative to dist/cli.js
  const npmSkillPath = join(import.meta.dirname, "skills", "kanban", "SKILL.md");
  if (existsSync(npmSkillPath)) {
    return npmSkillPath;
  }

  // When running from monorepo development: ../../skills/kanban/SKILL.md
  const devSkillPath = join(import.meta.dirname, "..", "..", "skills", "kanban", "SKILL.md");
  if (existsSync(devSkillPath)) {
    return devSkillPath;
  }

  throw new Error("Skill file not found. Run 'pnpm build' first.");
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

  const skillSourcePath = getSkillPath();
  const skillContent = readFileSync(skillSourcePath, "utf-8");

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

function getServerPath(): string {
  // When running from npm package: dist/server/index.js relative to dist/cli.js
  const npmServerPath = join(import.meta.dirname, "server", "index.js");
  if (existsSync(npmServerPath)) {
    return npmServerPath;
  }

  // When running from monorepo development: ../../server/dist/index.js
  const devServerPath = join(import.meta.dirname, "..", "..", "server", "dist", "index.js");
  if (existsSync(devServerPath)) {
    return devServerPath;
  }

  throw new Error("Server not found. Run 'pnpm build' first.");
}

async function startServer(
  port: number,
  detach: boolean,
  verbose: boolean
): Promise<ChildProcess | null> {
  const serverPath = getServerPath();

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

program
  .command("doctor")
  .description("Check system configuration and diagnose common issues")
  .option("-p, --port <port>", "Server port", DEFAULT_PORT.toString())
  .option("--fix", "Attempt to fix issues automatically")
  .action(async (options) => {
    const port = parseInt(options.port);
    const fix = options.fix || false;

    console.log("\n🩺 Claude Kanban Doctor\n");
    console.log("Checking your setup...\n");

    let issues = 0;
    let warnings = 0;

    // Check 1: Claude directory exists
    const claudeDirExists = existsSync(CLAUDE_DIR);
    if (claudeDirExists) {
      console.log("✅ Claude directory exists (~/.claude)");
    } else {
      console.log("❌ Claude directory not found (~/.claude)");
      issues++;
      if (fix) {
        mkdirSync(CLAUDE_DIR, { recursive: true });
        console.log("   → Created ~/.claude");
      }
    }

    // Check 2: MCP server configured
    const settingsPath = join(CLAUDE_DIR, "settings.json");
    let mcpConfigured = false;
    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        const mcpServers = settings.mcpServers || {};
        mcpConfigured = !!mcpServers["claude-kanban"];
        if (mcpConfigured) {
          console.log("✅ MCP server configured in settings.json");
        } else {
          console.log("❌ MCP server not configured");
          issues++;
          if (fix) {
            await configureMcp();
            console.log("   → Configured MCP server");
          }
        }
      } catch {
        console.log("⚠️  Could not parse settings.json");
        warnings++;
      }
    } else {
      console.log("❌ settings.json not found");
      issues++;
      if (fix) {
        await configureMcp();
        console.log("   → Created settings.json with MCP config");
      }
    }

    // Check 3: Skill installed
    const skillPath = join(SKILLS_DIR, "kanban", "SKILL.md");
    if (existsSync(skillPath)) {
      console.log("✅ /kanban skill installed");
    } else {
      console.log("❌ /kanban skill not installed");
      issues++;
      if (fix) {
        installSkills();
        console.log("   → Installed /kanban skill");
      }
    }

    // Check 4: Kanban directory exists
    if (existsSync(KANBAN_DIR)) {
      console.log("✅ Kanban data directory exists (~/.claude-kanban)");
    } else {
      console.log("⚠️  Kanban data directory not created yet");
      warnings++;
    }

    // Check 5: Database file
    const dbPath = join(KANBAN_DIR, "kanban.db");
    if (existsSync(dbPath)) {
      const stats = await import("node:fs/promises").then(fs => fs.stat(dbPath));
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`✅ Database exists (${sizeMB} MB)`);
    } else {
      console.log("⚠️  Database not created yet (will be created on first run)");
      warnings++;
    }

    // Check 6: Server running
    const serverRunning = await isServerRunning(port);
    if (serverRunning) {
      console.log(`✅ Server running on port ${port}`);

      // Get server stats
      try {
        const response = await fetch(`http://localhost:${port}/api/maintenance/stats`);
        if (response.ok) {
          const stats = await response.json() as {
            projects: number;
            tasks: { total: number; byStatus: Record<string, number> };
          };
          console.log(`   └── ${stats.projects} projects, ${stats.tasks.total} tasks`);
        }
      } catch {
        // Ignore stats fetch errors
      }
    } else {
      console.log(`⚠️  Server not running on port ${port}`);
      warnings++;
    }

    // Check 7: PID file
    const pid = getRunningPid();
    if (pid) {
      console.log(`✅ PID file valid (${pid})`);
    } else if (existsSync(PID_FILE)) {
      console.log("⚠️  Stale PID file found");
      warnings++;
      if (fix) {
        await clearPid();
        console.log("   → Removed stale PID file");
      }
    }

    // Summary
    console.log("\n" + "─".repeat(40));
    if (issues === 0 && warnings === 0) {
      console.log("✅ All checks passed! Your setup looks good.\n");
    } else if (issues === 0) {
      console.log(`⚠️  ${warnings} warning(s), but no critical issues.\n`);
    } else {
      console.log(`❌ ${issues} issue(s) found, ${warnings} warning(s).\n`);
      if (!fix) {
        console.log("Run with --fix to attempt automatic fixes:");
        console.log("  npx claude-kanban doctor --fix\n");
      }
    }

    // Quick reference
    console.log("Quick reference:");
    console.log("  Start server:     npx claude-kanban");
    console.log("  View board:       http://localhost:" + port);
    console.log("  Run skill:        /kanban <project-id>");
    console.log("  View logs:        npx claude-kanban logs -f");
    console.log("");
  });

program.parse();

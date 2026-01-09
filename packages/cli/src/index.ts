#!/usr/bin/env node
import { program } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DEFAULT_PORT, KANBAN_DIR, LOG_FILE, PID_FILE } from "./constants.js";
import {
  ensureKanbanDir,
  isServerRunning,
  getRunningPid,
  clearPid,
  startServer,
  waitForServer,
} from "./server.js";
import { registerProject } from "./project.js";
import { configureMcp, installSkills, removeMcp, removeSkills } from "./skills.js";
import { runDoctor } from "./doctor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

program
  .name("claude-kanban")
  .description("Local kanban board for managing Claude Code projects")
  .version(pkg.version);

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
    const { join } = await import("node:path");
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
    await runDoctor(port, fix);
  });

program
  .command("uninstall")
  .description("Remove MCP server and skill from Claude Code configuration")
  .option("--all", "Also remove all data (database, logs)")
  .action(async (options) => {
    const fs = await import("node:fs/promises");
    const { join } = await import("node:path");
    const removed: string[] = [];

    const mcpRemoved = removeMcp();
    if (mcpRemoved) {
      removed.push("MCP server config");
    }

    const skillsRemoved = removeSkills();
    if (skillsRemoved) {
      removed.push("/kanban skill");
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
      if (existsSync(KANBAN_DIR)) {
        await fs.rmdir(KANBAN_DIR).catch(() => {});
      }
    }

    if (removed.length === 0) {
      console.log("Nothing to uninstall");
    } else {
      console.log(`✓ Removed: ${removed.join(", ")}`);
      console.log("\nRestart Claude Code to complete the uninstall.");
    }
  });

program.parse();

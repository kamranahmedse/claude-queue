import { spawn, ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { KANBAN_DIR, PID_FILE, LOG_FILE } from "./constants.js";

export function ensureKanbanDir(): void {
  if (!existsSync(KANBAN_DIR)) {
    mkdirSync(KANBAN_DIR, { recursive: true });
  }
}

export async function isServerRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function getRunningPid(): number | null {
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

export function findServerPidByPort(port: number): number | null {
  try {
    const { execSync } = require("node:child_process");
    const result = execSync(`lsof -ti tcp:${port}`, { encoding: "utf-8" }).trim();
    if (result) {
      const pids = result.split("\n").map((p: string) => parseInt(p.trim()));
      return pids[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePid(pid: number): void {
  ensureKanbanDir();
  writeFileSync(PID_FILE, pid.toString());
}

export async function clearPid(): Promise<void> {
  if (existsSync(PID_FILE)) {
    const fs = await import("node:fs/promises");
    await fs.unlink(PID_FILE).catch(() => {});
  }
}

function getServerPath(): string {
  const npmServerPath = join(import.meta.dirname, "server", "index.js");
  if (existsSync(npmServerPath)) {
    return npmServerPath;
  }

  const devServerPath = join(import.meta.dirname, "..", "..", "server", "dist", "index.js");
  if (existsSync(devServerPath)) {
    return devServerPath;
  }

  throw new Error("Server not found. Run 'pnpm build' first.");
}

export async function startServer(
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

export async function waitForServer(port: number, maxWait = 10000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await isServerRunning(port)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

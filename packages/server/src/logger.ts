import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const KANBAN_DIR = join(homedir(), ".claude-queue");
const LOG_FILE = join(KANBAN_DIR, "server.log");

let logStream: ReturnType<typeof createWriteStream> | null = null;

function ensureLogFile() {
  if (logStream) {
    return logStream;
  }

  if (!existsSync(KANBAN_DIR)) {
    mkdirSync(KANBAN_DIR, { recursive: true });
  }

  logStream = createWriteStream(LOG_FILE, { flags: "a" });
  return logStream;
}

export function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  process.stdout.write(line);

  const stream = ensureLogFile();
  stream.write(line);
}

export function logRequest(method: string, url: string, status: number, duration: number) {
  log(`${method} ${url} ${status} ${duration}ms`);
}

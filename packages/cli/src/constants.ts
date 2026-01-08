import { join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_PORT = 3333;
export const KANBAN_DIR = join(homedir(), ".claude-kanban");
export const PID_FILE = join(KANBAN_DIR, "server.pid");
export const LOG_FILE = join(KANBAN_DIR, "server.log");
export const CLAUDE_DIR = join(homedir(), ".claude");
export const SKILLS_DIR = join(CLAUDE_DIR, "skills");

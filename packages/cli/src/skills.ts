import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { SKILLS_DIR, DEFAULT_PORT, MCP_SETTINGS_FILE } from "./constants.js";

const LEGACY_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");

export async function configureMcp(): Promise<void> {
  let settings: Record<string, unknown> = {};
  if (existsSync(MCP_SETTINGS_FILE)) {
    try {
      settings = JSON.parse(readFileSync(MCP_SETTINGS_FILE, "utf-8"));
    } catch {
      console.log("Warning: Could not parse existing .claude.json");
    }
  }

  const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};

  if (!mcpServers["claude-queue"]) {
    mcpServers["claude-queue"] = {
      type: "stdio",
      command: "npx",
      args: ["-y", "-p", "claude-queue", "claude-queue-mcp"],
      env: {
        KANBAN_SERVER_URL: `http://localhost:${DEFAULT_PORT}`,
      },
    };
    settings.mcpServers = mcpServers;
    writeFileSync(MCP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log("✓ Configured MCP server in ~/.claude.json");
  }
}

function getSkillPath(): string {
  const npmSkillPath = join(import.meta.dirname, "skills", "queue", "SKILL.md");
  if (existsSync(npmSkillPath)) {
    return npmSkillPath;
  }

  const devSkillPath = join(import.meta.dirname, "..", "..", "skills", "queue", "SKILL.md");
  if (existsSync(devSkillPath)) {
    return devSkillPath;
  }

  throw new Error("Skill file not found. Run 'pnpm build' first.");
}

export function installSkills(force = false): boolean {
  const queueSkillDir = join(SKILLS_DIR, "queue");
  const queueSkillFile = join(queueSkillDir, "SKILL.md");

  if (existsSync(queueSkillFile) && !force) {
    return false;
  }

  if (!existsSync(SKILLS_DIR)) {
    mkdirSync(SKILLS_DIR, { recursive: true });
  }

  if (!existsSync(queueSkillDir)) {
    mkdirSync(queueSkillDir, { recursive: true });
  }

  const skillSourcePath = getSkillPath();
  const skillContent = readFileSync(skillSourcePath, "utf-8");

  writeFileSync(queueSkillFile, skillContent);
  console.log("✓ Installed /queue skill to ~/.claude/skills/queue/");
  return true;
}

export function removeMcp(): boolean {
  let removed = false;

  // Remove from ~/.claude.json (correct location)
  if (existsSync(MCP_SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(MCP_SETTINGS_FILE, "utf-8"));
      const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};
      if (mcpServers["claude-queue"]) {
        delete mcpServers["claude-queue"];
        settings.mcpServers = mcpServers;
        writeFileSync(MCP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
        removed = true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Also clean up legacy location ~/.claude/settings.json
  if (existsSync(LEGACY_SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(LEGACY_SETTINGS_FILE, "utf-8"));
      const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};
      if (mcpServers["claude-queue"]) {
        delete mcpServers["claude-queue"];
        settings.mcpServers = mcpServers;
        writeFileSync(LEGACY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
        removed = true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return removed;
}

export function removeSkills(): boolean {
  const queueSkillDir = join(SKILLS_DIR, "queue");

  if (!existsSync(queueSkillDir)) {
    return false;
  }

  rmSync(queueSkillDir, { recursive: true });
  return true;
}

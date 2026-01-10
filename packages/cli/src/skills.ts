import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_DIR, SKILLS_DIR, DEFAULT_PORT } from "./constants.js";

export async function configureMcp(): Promise<void> {
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

  if (!mcpServers["claude-queue"]) {
    mcpServers["claude-queue"] = {
      command: "npx",
      args: ["-y", "-p", "claude-queue", "claude-queue-mcp"],
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
  const settingsPath = join(CLAUDE_DIR, "settings.json");

  if (!existsSync(settingsPath)) {
    return false;
  }

  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return false;
  }

  const mcpServers = (settings.mcpServers as Record<string, unknown>) || {};

  if (!mcpServers["claude-queue"]) {
    return false;
  }

  delete mcpServers["claude-queue"];
  settings.mcpServers = mcpServers;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
}

export function removeSkills(): boolean {
  const queueSkillDir = join(SKILLS_DIR, "queue");

  if (!existsSync(queueSkillDir)) {
    return false;
  }

  rmSync(queueSkillDir, { recursive: true });
  return true;
}

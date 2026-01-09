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

  if (!mcpServers["claude-board"]) {
    mcpServers["claude-board"] = {
      command: "npx",
      args: ["-y", "-p", "claude-board", "claude-board-mcp"],
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
  const npmSkillPath = join(import.meta.dirname, "skills", "kanban", "SKILL.md");
  if (existsSync(npmSkillPath)) {
    return npmSkillPath;
  }

  const devSkillPath = join(import.meta.dirname, "..", "..", "skills", "kanban", "SKILL.md");
  if (existsSync(devSkillPath)) {
    return devSkillPath;
  }

  throw new Error("Skill file not found. Run 'pnpm build' first.");
}

export function installSkills(): void {
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

  if (!mcpServers["claude-board"]) {
    return false;
  }

  delete mcpServers["claude-board"];
  settings.mcpServers = mcpServers;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
}

export function removeSkills(): boolean {
  const kanbanSkillDir = join(SKILLS_DIR, "kanban");

  if (!existsSync(kanbanSkillDir)) {
    return false;
  }

  rmSync(kanbanSkillDir, { recursive: true });
  return true;
}

#!/usr/bin/env tsx
/**
 * Generates SKILL.md files for both kanban and kanban-dev from a single template.
 * Run with: npx tsx skills/generate-skills.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, "SKILL.template.md");

interface SkillConfig {
  name: string;
  description: string;
  titleSuffix: string;
  serverDescription: string;
  serverNote: string;
}

const configs: Record<string, SkillConfig> = {
  kanban: {
    name: "kanban",
    description: "Watch the kanban board and work through tasks autonomously. Use this when starting a coding session with the kanban board.",
    titleSuffix: "",
    serverDescription: "",
    serverNote: "This uses the production MCP server (claude-kanban) on port 3333.\nMake sure the kanban server is running (`npx claude-kanban` or `make start`).",
  },
  "kanban-dev": {
    name: "kanban-dev",
    description: "Watch the kanban board on the development server (port 3334) and work through tasks autonomously. Use this when starting a coding session with the dev kanban board.",
    titleSuffix: " (Development)",
    serverDescription: " on the DEVELOPMENT server (port 3334)",
    serverNote: "This uses the DEV MCP server (claude-kanban-dev) on port 3334.\nMake sure `make dev` is running.",
  },
};

function generateSkill(skillName: string, config: SkillConfig): void {
  const template = readFileSync(templatePath, "utf-8");

  const content = template
    .replace(/\{\{SKILL_NAME\}\}/g, config.name)
    .replace(/\{\{SKILL_DESCRIPTION\}\}/g, config.description)
    .replace(/\{\{TITLE_SUFFIX\}\}/g, config.titleSuffix)
    .replace(/\{\{SERVER_DESCRIPTION\}\}/g, config.serverDescription)
    .replace(/\{\{SERVER_NOTE\}\}/g, config.serverNote);

  const skillDir = join(__dirname, skillName);
  if (!existsSync(skillDir)) {
    mkdirSync(skillDir, { recursive: true });
  }

  const outputPath = join(skillDir, "SKILL.md");
  writeFileSync(outputPath, content);
  console.log(`✓ Generated ${skillName}/SKILL.md`);
}

function main(): void {
  console.log("Generating skill files from template...\n");

  for (const [name, config] of Object.entries(configs)) {
    generateSkill(name, config);
  }

  console.log("\nDone!");
}

main();

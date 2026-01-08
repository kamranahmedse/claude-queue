import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_DIR, KANBAN_DIR, SKILLS_DIR } from "./constants.js";
import { isServerRunning, getRunningPid, clearPid } from "./server.js";
import { configureMcp, installSkills } from "./skills.js";

export async function runDoctor(port: number, fix: boolean): Promise<void> {
  console.log("\n🩺 Claude Kanban Doctor\n");
  console.log("Checking your setup...\n");

  let issues = 0;
  let warnings = 0;

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

  if (existsSync(KANBAN_DIR)) {
    console.log("✅ Kanban data directory exists (~/.claude-kanban)");
  } else {
    console.log("⚠️  Kanban data directory not created yet");
    warnings++;
  }

  const dbPath = join(KANBAN_DIR, "kanban.db");
  if (existsSync(dbPath)) {
    const stats = await import("node:fs/promises").then((fs) => fs.stat(dbPath));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Database exists (${sizeMB} MB)`);
  } else {
    console.log("⚠️  Database not created yet (will be created on first run)");
    warnings++;
  }

  const serverRunning = await isServerRunning(port);
  if (serverRunning) {
    console.log(`✅ Server running on port ${port}`);

    try {
      const response = await fetch(`http://localhost:${port}/api/maintenance/stats`);
      if (response.ok) {
        const stats = (await response.json()) as {
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

  const pid = getRunningPid();
  if (pid) {
    console.log(`✅ PID file valid (${pid})`);
  } else if (existsSync(join(KANBAN_DIR, "server.pid"))) {
    console.log("⚠️  Stale PID file found");
    warnings++;
    if (fix) {
      await clearPid();
      console.log("   → Removed stale PID file");
    }
  }

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

  console.log("Quick reference:");
  console.log("  Start server:     npx claude-kanban");
  console.log("  View board:       http://localhost:" + port);
  console.log("  Run skill:        /kanban <project-id>");
  console.log("  View logs:        npx claude-kanban logs -f");
  console.log("");
}

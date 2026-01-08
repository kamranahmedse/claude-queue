#!/usr/bin/env node
/**
 * Build script for claude-kanban npm package
 *
 * This bundles everything (CLI, Server, MCP, UI) into a single publishable package.
 */

import { execSync } from "node:child_process";
import { cpSync, rmSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = join(__dirname, "..");
const packagesRoot = join(cliRoot, "..");
const distDir = join(cliRoot, "dist");

function run(cmd, cwd = cliRoot) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function clean() {
  console.log("\n📦 Cleaning dist...");
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });
}

function buildUI() {
  console.log("\n🎨 Building UI...");
  const uiDir = join(packagesRoot, "ui");
  run("pnpm build", uiDir);
}

function buildServer() {
  console.log("\n🖥️  Building Server...");
  const serverDir = join(packagesRoot, "server");
  run("pnpm build", serverDir);
}

function buildMCP() {
  console.log("\n🔌 Building MCP...");
  const mcpDir = join(packagesRoot, "mcp");
  run("pnpm build", mcpDir);
}

function bundleCLI() {
  console.log("\n⚡ Bundling CLI...");
  run("npx tsup src/index.ts --format esm --out-dir dist --entry.cli=src/index.ts --no-splitting", cliRoot);
}

function copyAssets() {
  console.log("\n📋 Copying assets...");

  // Copy UI dist
  const uiSrc = join(packagesRoot, "ui", "dist");
  const uiDest = join(distDir, "ui");
  if (existsSync(uiSrc)) {
    cpSync(uiSrc, uiDest, { recursive: true });
    console.log("  ✓ UI copied to dist/ui");
  } else {
    console.error("  ✗ UI dist not found! Run build:ui first.");
    process.exit(1);
  }

  // Copy server dist
  const serverSrc = join(packagesRoot, "server", "dist");
  const serverDest = join(distDir, "server");
  if (existsSync(serverSrc)) {
    cpSync(serverSrc, serverDest, { recursive: true });
    console.log("  ✓ Server copied to dist/server");
  } else {
    console.error("  ✗ Server dist not found! Run build:server first.");
    process.exit(1);
  }

  // Copy MCP dist
  const mcpSrc = join(packagesRoot, "mcp", "dist");
  const mcpDest = join(distDir, "mcp");
  if (existsSync(mcpSrc)) {
    cpSync(mcpSrc, mcpDest, { recursive: true });
    console.log("  ✓ MCP copied to dist/mcp");
  } else {
    console.error("  ✗ MCP dist not found! Run build:mcp first.");
    process.exit(1);
  }
}

function createEntryPoints() {
  console.log("\n🔧 Creating entry points...");

  // Create MCP entry point wrapper
  const mcpWrapper = `#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpPath = join(__dirname, "mcp", "index.js");

// Dynamic import to run the MCP server
import(mcpPath);
`;

  writeFileSync(join(distDir, "mcp.js"), mcpWrapper);
  console.log("  ✓ Created dist/mcp.js wrapper");
}

function main() {
  console.log("🚀 Building claude-kanban package...\n");

  clean();
  buildUI();
  buildServer();
  buildMCP();
  bundleCLI();
  copyAssets();
  createEntryPoints();

  console.log("\n✅ Build complete!");
  console.log("   dist/cli.js  - CLI entry point");
  console.log("   dist/mcp.js  - MCP server entry point");
  console.log("   dist/server/ - Server files");
  console.log("   dist/ui/     - UI static files");
}

try {
  main();
} catch (err) {
  console.error("Build failed:", err);
  process.exit(1);
}

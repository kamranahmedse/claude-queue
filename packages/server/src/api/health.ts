import { Router, type Router as RouterType } from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getDb } from "../db/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"));

const router: RouterType = Router();
const startTime = Date.now();

router.get("/", (_req, res) => {
  const db = getDb();

  const projects = db.prepare("SELECT id, name FROM projects").all() as { id: string; name: string }[];
  const projectsWithCounts = projects.map((p) => {
    const count = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE project_id = ?").get(p.id) as { count: number };
    return { ...p, tasks: count.count };
  });

  const uptimeMs = Date.now() - startTime;
  const uptimeMinutes = Math.floor(uptimeMs / 60000);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptime = uptimeHours > 0
    ? `${uptimeHours}h ${uptimeMinutes % 60}m`
    : `${uptimeMinutes}m`;

  res.json({
    status: "ok",
    version: pkg.version,
    uptime,
    database: "connected",
    projects: projectsWithCounts,
  });
});

export default router;

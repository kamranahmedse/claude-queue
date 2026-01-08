import { Router, type Router as RouterType } from "express";
import { customAlphabet, nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { Project } from "../types.js";

const router: RouterType = Router();
const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

const DEFAULT_TEMPLATES = [
  { key: "bug-fix", title: "Bug fix", description: "Investigate and fix a reported bug. Include root cause analysis." },
  { key: "add-tests", title: "Add tests", description: "Write unit/integration tests for existing functionality." },
  { key: "refactor", title: "Refactor", description: "Improve code structure without changing behavior. Focus on readability and maintainability." },
  { key: "code-review", title: "Code review", description: "Review recent changes for bugs, performance issues, and best practices." },
  { key: "documentation", title: "Documentation", description: "Add or update documentation, comments, or README files." },
];

function seedDefaultTemplates(projectId: string): void {
  const db = getDb();

  const seededKeys = db
    .prepare("SELECT template_key FROM seeded_templates WHERE project_id = ?")
    .all(projectId) as { template_key: string }[];
  const seededKeySet = new Set(seededKeys.map((row) => row.template_key));

  const templatesToSeed = DEFAULT_TEMPLATES.filter((t) => !seededKeySet.has(t.key));

  if (templatesToSeed.length === 0) {
    return;
  }

  const maxPosition = db
    .prepare("SELECT COALESCE(MAX(position), -1) as max FROM templates WHERE project_id = ?")
    .get(projectId) as { max: number };

  const insertTemplateStmt = db.prepare(`
    INSERT INTO templates (id, project_id, title, description, position)
    VALUES (?, ?, ?, ?, ?)
  `);
  const markSeededStmt = db.prepare(`
    INSERT INTO seeded_templates (project_id, template_key)
    VALUES (?, ?)
  `);

  db.transaction(() => {
    templatesToSeed.forEach((template, index) => {
      insertTemplateStmt.run(nanoid(), projectId, template.title, template.description, maxPosition.max + 1 + index);
      markSeededStmt.run(projectId, template.key);
    });
  })();
}

router.get("/", (_req, res) => {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Project[];
  res.json(projects);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project | undefined;

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (req.query.heartbeat === "true") {
    db.prepare("UPDATE projects SET claude_last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project;
    res.json(updated);
    return;
  }

  res.json(project);
});

router.post("/", (req, res) => {
  const { path, name } = req.body;

  if (!path || !name) {
    res.status(400).json({ error: "path and name are required" });
    return;
  }

  const db = getDb();

  const existing = db.prepare("SELECT * FROM projects WHERE path = ?").get(path) as Project | undefined;
  if (existing) {
    res.json(existing);
    return;
  }

  const id = `kbn-${generateId()}`;
  const stmt = db.prepare("INSERT INTO projects (id, path, name) VALUES (?, ?, ?)");
  stmt.run(id, path, name);

  seedDefaultTemplates(id);

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project;
  res.status(201).json(project);
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json({ success: true });
});

router.post("/:id/pause", (req, res) => {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project | undefined;

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  db.prepare("UPDATE projects SET paused = 1 WHERE id = ?").run(req.params.id);

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project;
  res.json(updated);
});

router.post("/:id/resume", (req, res) => {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project | undefined;

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  db.prepare("UPDATE projects SET paused = 0 WHERE id = ?").run(req.params.id);

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project;
  res.json(updated);
});

router.post("/:id/heartbeat", (req, res) => {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project | undefined;

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  db.prepare("UPDATE projects SET claude_last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id) as Project;
  res.json(updated);
});

function formatDateForSqlite(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

router.get("/:id/stats", (req, res) => {
  const db = getDb();
  const projectId = req.params.id;

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as Project | undefined;
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfWeekUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()));
  const startOfToday = formatDateForSqlite(startOfTodayUtc);
  const startOfWeek = formatDateForSqlite(startOfWeekUtc);

  const completedToday = db.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE project_id = ? AND status = 'done' AND completed_at >= ?
  `).get(projectId, startOfToday) as { count: number };

  const completedThisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE project_id = ? AND status = 'done' AND completed_at >= ?
  `).get(projectId, startOfWeek) as { count: number };

  const totalCompleted = db.prepare(`
    SELECT COUNT(*) as count FROM tasks
    WHERE project_id = ? AND status = 'done'
  `).get(projectId) as { count: number };

  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks
    WHERE project_id = ?
    GROUP BY status
  `).all(projectId) as { status: string; count: number }[];

  const completedTasks = db.prepare(`
    SELECT started_at, completed_at FROM tasks
    WHERE project_id = ? AND status = 'done' AND started_at IS NOT NULL AND completed_at IS NOT NULL
  `).all(projectId) as { started_at: string; completed_at: string }[];

  let totalTimeMs = 0;
  let tasksWithTime = 0;
  for (const task of completedTasks) {
    const started = new Date(task.started_at).getTime();
    const completed = new Date(task.completed_at).getTime();
    if (completed > started) {
      totalTimeMs += completed - started;
      tasksWithTime++;
    }
  }

  const avgTimeMs = tasksWithTime > 0 ? Math.round(totalTimeMs / tasksWithTime) : 0;

  res.json({
    completedToday: completedToday.count,
    completedThisWeek: completedThisWeek.count,
    totalCompleted: totalCompleted.count,
    totalTimeMs,
    avgTimeMs,
    tasksWithTime,
    tasksByStatus: Object.fromEntries(tasksByStatus.map((row) => [row.status, row.count])),
  });
});

export default router;

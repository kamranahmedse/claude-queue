import { Router } from "express";
import { customAlphabet, nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { Project } from "../types.js";

const router = Router();
const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

const DEFAULT_TEMPLATES = [
  { title: "Bug fix", description: "Investigate and fix a reported bug. Include root cause analysis." },
  { title: "Add tests", description: "Write unit/integration tests for existing functionality." },
  { title: "Refactor", description: "Improve code structure without changing behavior. Focus on readability and maintainability." },
  { title: "Code review", description: "Review recent changes for bugs, performance issues, and best practices." },
  { title: "Documentation", description: "Add or update documentation, comments, or README files." },
];

function seedDefaultTemplates(projectId: string): void {
  const db = getDb();

  const existingCount = db
    .prepare("SELECT COUNT(*) as count FROM templates WHERE project_id = ?")
    .get(projectId) as { count: number };

  if (existingCount.count > 0) {
    return;
  }

  const insertStmt = db.prepare(`
    INSERT INTO templates (id, project_id, title, description, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    DEFAULT_TEMPLATES.forEach((template, index) => {
      insertStmt.run(nanoid(), projectId, template.title, template.description, index);
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

export default router;

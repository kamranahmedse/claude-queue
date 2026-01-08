import { Router } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { Template } from "../types.js";

const router = Router();

router.get("/project/:projectId", (req, res) => {
  const db = getDb();
  const templates = db
    .prepare("SELECT * FROM templates WHERE project_id = ? ORDER BY position ASC")
    .all(req.params.projectId) as Template[];
  res.json(templates);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(req.params.id) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

router.post("/project/:projectId", (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const db = getDb();
  const projectId = req.params.projectId;

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const maxPosition = db
    .prepare("SELECT COALESCE(MAX(position), -1) as max FROM templates WHERE project_id = ?")
    .get(projectId) as { max: number };

  const id = nanoid();
  const position = maxPosition.max + 1;

  db.prepare(`
    INSERT INTO templates (id, project_id, title, description, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, projectId, title, description || null, position);

  const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id) as Template;
  res.status(201).json(template);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(req.params.id) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const allowedFields = ["title", "description"];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.json(template);
    return;
  }

  values.push(req.params.id);

  db.prepare(`UPDATE templates SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM templates WHERE id = ?").get(req.params.id) as Template;
  res.json(updated);
});

router.post("/:id/move", (req, res) => {
  const { position } = req.body;

  if (position === undefined) {
    res.status(400).json({ error: "position is required" });
    return;
  }

  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(req.params.id) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const oldPosition = template.position;

  db.transaction(() => {
    if (position > oldPosition) {
      db.prepare(`
        UPDATE templates SET position = position - 1
        WHERE project_id = ? AND position > ? AND position <= ?
      `).run(template.project_id, oldPosition, position);
    } else if (position < oldPosition) {
      db.prepare(`
        UPDATE templates SET position = position + 1
        WHERE project_id = ? AND position >= ? AND position < ?
      `).run(template.project_id, position, oldPosition);
    }

    db.prepare(`UPDATE templates SET position = ? WHERE id = ?`).run(position, req.params.id);
  })();

  const updated = db.prepare("SELECT * FROM templates WHERE id = ?").get(req.params.id) as Template;
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(req.params.id) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE templates SET position = position - 1
      WHERE project_id = ? AND position > ?
    `).run(template.project_id, template.position);

    db.prepare("DELETE FROM templates WHERE id = ?").run(req.params.id);
  })();

  res.json({ success: true });
});

router.post("/:id/create-task", (req, res) => {
  const { status = "backlog" } = req.body;

  const validStatuses = ["backlog", "ready"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be backlog or ready" });
    return;
  }

  const db = getDb();
  const template = db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .get(req.params.id) as Template | undefined;

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const maxPosition = db
    .prepare("SELECT COALESCE(MAX(position), -1) as max FROM tasks WHERE project_id = ? AND status = ?")
    .get(template.project_id, status) as { max: number };

  const id = nanoid();
  const position = maxPosition.max + 1;

  db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, status, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, template.project_id, template.title, template.description, status, position);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
  res.status(201).json({
    ...task,
    blocked: Boolean(task.blocked),
  });
});

export default router;

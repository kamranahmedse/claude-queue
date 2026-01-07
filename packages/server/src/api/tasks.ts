import { Router } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { Task, Comment, TaskWithComments } from "../types.js";

const router = Router();

function rowToTask(row: any): Task {
  return {
    ...row,
    blocked: Boolean(row.blocked),
  };
}

router.get("/project/:projectId", (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let query = "SELECT * FROM tasks WHERE project_id = ?";
  const params: any[] = [req.params.projectId];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " ORDER BY position ASC";

  const tasks = db.prepare(query).all(...params) as any[];
  res.json(tasks.map(rowToTask));
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const comments = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(req.params.id) as Comment[];

  const result: TaskWithComments = {
    ...rowToTask(task),
    comments,
  };

  res.json(result);
});

router.post("/project/:projectId", (req, res) => {
  const { title, description, status = "backlog" } = req.body;

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
    .prepare("SELECT COALESCE(MAX(position), -1) as max FROM tasks WHERE project_id = ? AND status = ?")
    .get(projectId, status) as { max: number };

  const id = nanoid();
  const position = maxPosition.max + 1;

  db.prepare(`
    INSERT INTO tasks (id, project_id, title, description, status, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, projectId, title, description || null, status, position);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
  res.status(201).json(rowToTask(task));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const allowedFields = ["title", "description", "blocked", "current_activity"];
  const updates: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(field === "blocked" ? (req.body[field] ? 1 : 0) : req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.json(rowToTask(task));
    return;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(req.params.id);

  db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any;
  res.json(rowToTask(updated));
});

router.post("/:id/move", (req, res) => {
  const { status, position } = req.body;

  if (!status || position === undefined) {
    res.status(400).json({ error: "status and position are required" });
    return;
  }

  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const oldStatus = task.status;
  const oldPosition = task.position;

  db.transaction(() => {
    if (oldStatus === status) {
      if (position > oldPosition) {
        db.prepare(`
          UPDATE tasks SET position = position - 1
          WHERE project_id = ? AND status = ? AND position > ? AND position <= ?
        `).run(task.project_id, status, oldPosition, position);
      } else if (position < oldPosition) {
        db.prepare(`
          UPDATE tasks SET position = position + 1
          WHERE project_id = ? AND status = ? AND position >= ? AND position < ?
        `).run(task.project_id, status, position, oldPosition);
      }
    } else {
      db.prepare(`
        UPDATE tasks SET position = position - 1
        WHERE project_id = ? AND status = ? AND position > ?
      `).run(task.project_id, oldStatus, oldPosition);

      db.prepare(`
        UPDATE tasks SET position = position + 1
        WHERE project_id = ? AND status = ? AND position >= ?
      `).run(task.project_id, status, position);
    }

    db.prepare(`
      UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, position, req.params.id);
  })();

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any;
  res.json(rowToTask(updated));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as any | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE tasks SET position = position - 1
      WHERE project_id = ? AND status = ? AND position > ?
    `).run(task.project_id, task.status, task.position);

    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  })();

  res.json({ success: true });
});

export default router;

import { Router, type Router as RouterType } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { Task, Comment, TaskWithComments, TaskStatus } from "../types.js";

const router: RouterType = Router();

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  blocked: number;
  current_activity: string | null;
  starting_commit: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  author: "user" | "claude";
  content: string;
  seen: number;
  created_at: string;
}

function updateProjectHeartbeat(projectId: string): void {
  const db = getDb();
  db.prepare("UPDATE projects SET claude_last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(projectId);
}

function rowToTask(row: TaskRow): Task {
  return {
    ...row,
    blocked: Boolean(row.blocked),
  };
}

function rowToComment(row: CommentRow): Comment {
  return {
    ...row,
    seen: Boolean(row.seen),
  };
}

router.get("/project/:projectId", (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let query = "SELECT * FROM tasks WHERE project_id = ?";
  const params: (string | TaskStatus)[] = [req.params.projectId];

  if (status) {
    query += " AND status = ?";
    params.push(status as TaskStatus);
  }

  query += " ORDER BY position ASC";

  const tasks = db.prepare(query).all(...params) as TaskRow[];
  res.json(tasks.map(rowToTask));
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const commentsRaw = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(req.params.id) as CommentRow[];

  const result: TaskWithComments = {
    ...rowToTask(task),
    comments: commentsRaw.map(rowToComment),
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

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  res.status(201).json(rowToTask(task));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const allowedFields = ["title", "description", "blocked", "current_activity"];
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

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

  if (req.body.current_activity !== undefined) {
    updateProjectHeartbeat(task.project_id);
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow;
  res.json(rowToTask(updated));
});

router.post("/:id/move", (req, res) => {
  const { status, position, starting_commit } = req.body;

  if (!status || position === undefined) {
    res.status(400).json({ error: "status and position are required" });
    return;
  }

  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow | undefined;

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

    if (status === "in_progress" && starting_commit) {
      db.prepare(`
        UPDATE tasks SET status = ?, position = ?, starting_commit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, position, starting_commit, req.params.id);
    } else {
      db.prepare(`
        UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, position, req.params.id);
    }
  })();

  if (status === "in_progress" || status === "done") {
    updateProjectHeartbeat(task.project_id);
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow;
  res.json(rowToTask(updated));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow | undefined;

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

router.delete("/project/:projectId/status/:status", (req, res) => {
  const db = getDb();
  const { projectId, status } = req.params;

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const validStatuses = ["backlog", "ready", "in_progress", "done"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const result = db.prepare("DELETE FROM tasks WHERE project_id = ? AND status = ?").run(projectId, status);

  res.json({ success: true, deleted: result.changes });
});

export default router;

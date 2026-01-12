import { Router, type Router as RouterType } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import { updateProjectHeartbeat } from "../utils/heartbeat.js";
import { logTaskActivity } from "../utils/activity.js";
import {
  rowToTask,
  rowToComment,
  rowToTaskActivity,
  type TaskRow,
  type CommentRow,
  type TaskActivityRow,
} from "../utils/mappers.js";
import type { TaskWithActivities, TaskStatus, PendingAction } from "../types.js";

const router: RouterType = Router();

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

  const pendingActionsQuery = db.prepare(`
    SELECT task_id, content FROM comments
    WHERE task_id IN (${tasks.map(() => "?").join(",")})
    AND author = 'user'
    AND seen = 0
    AND (content LIKE '%[ACTION:CANCEL]%' OR content LIKE '%[ACTION:RESET]%')
  `);

  const pendingActions: Record<string, PendingAction> = {};
  if (tasks.length > 0) {
    const actionComments = pendingActionsQuery.all(...tasks.map(t => t.id)) as { task_id: string; content: string }[];
    for (const comment of actionComments) {
      if (comment.content.includes("[ACTION:CANCEL]")) {
        pendingActions[comment.task_id] = "cancel";
      } else if (comment.content.includes("[ACTION:RESET]")) {
        pendingActions[comment.task_id] = "reset";
      }
    }
  }

  res.json(tasks.map(task => rowToTask(task, pendingActions[task.id] || null)));
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

  const activitiesRaw = db
    .prepare("SELECT * FROM task_activity WHERE task_id = ? ORDER BY created_at ASC")
    .all(req.params.id) as TaskActivityRow[];

  let pendingAction: PendingAction = null;
  const unseenActionComment = commentsRaw.find(
    c => c.author === "user" && !c.seen && (c.content.includes("[ACTION:CANCEL]") || c.content.includes("[ACTION:RESET]"))
  );
  if (unseenActionComment) {
    pendingAction = unseenActionComment.content.includes("[ACTION:CANCEL]") ? "cancel" : "reset";
  }

  const result: TaskWithActivities = {
    ...rowToTask(task, pendingAction),
    comments: commentsRaw.map(rowToComment),
    activities: activitiesRaw.map(rowToTaskActivity),
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

  logTaskActivity(id, "created", null, status);

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

  if (req.body.title !== undefined && req.body.title !== task.title) {
    logTaskActivity(req.params.id, "title_change", task.title, req.body.title);
  }
  if (req.body.description !== undefined && req.body.description !== task.description) {
    logTaskActivity(req.params.id, "description_change", task.description, req.body.description);
  }
  if (req.body.blocked !== undefined && Boolean(req.body.blocked) !== Boolean(task.blocked)) {
    logTaskActivity(req.params.id, "blocked_change", String(Boolean(task.blocked)), String(Boolean(req.body.blocked)));
  }

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

    if (status === "in_progress") {
      if (starting_commit) {
        db.prepare(`
          UPDATE tasks SET status = ?, position = ?, starting_commit = ?, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, position, starting_commit, req.params.id);
      } else {
        db.prepare(`
          UPDATE tasks SET status = ?, position = ?, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, position, req.params.id);
      }
    } else if (status === "done") {
      db.prepare(`
        UPDATE tasks SET status = ?, position = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, position, req.params.id);
    } else {
      db.prepare(`
        UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, position, req.params.id);
    }
  })();

  if (oldStatus !== status) {
    logTaskActivity(req.params.id, "status_change", oldStatus, status);
  }

  if (status === "in_progress" || status === "done") {
    updateProjectHeartbeat(task.project_id);
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow;
  res.json(rowToTask(updated));
});

router.post("/:id/force-reset", (req, res) => {
  const { status = "backlog" } = req.body;

  if (status !== "ready" && status !== "backlog") {
    res.status(400).json({ error: "status must be 'ready' or 'backlog'" });
    return;
  }

  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id) as TaskRow | undefined;

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (task.status !== "in_progress") {
    res.status(400).json({ error: "Can only force-reset tasks that are in progress" });
    return;
  }

  const oldStatus = task.status;

  db.transaction(() => {
    db.prepare(`
      UPDATE tasks SET position = position - 1
      WHERE project_id = ? AND status = ? AND position > ?
    `).run(task.project_id, oldStatus, task.position);

    const maxPosition = db
      .prepare("SELECT COALESCE(MAX(position), -1) as max FROM tasks WHERE project_id = ? AND status = ?")
      .get(task.project_id, status) as { max: number };

    const newPosition = maxPosition.max + 1;

    db.prepare(`
      UPDATE tasks
      SET status = ?, position = ?, started_at = NULL, starting_commit = NULL,
          current_activity = NULL, blocked = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, newPosition, req.params.id);

    db.prepare(`
      UPDATE comments SET seen = 1
      WHERE task_id = ? AND author = 'user' AND seen = 0
      AND (content LIKE '%[ACTION:CANCEL]%' OR content LIKE '%[ACTION:RESET]%')
    `).run(req.params.id);
  })();

  logTaskActivity(req.params.id, "status_change", oldStatus, status);

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

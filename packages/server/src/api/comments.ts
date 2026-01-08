import { Router, type Router as RouterType } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import { updateProjectHeartbeatForTask } from "../utils/heartbeat.js";
import { rowToComment, type CommentRow } from "../utils/mappers.js";
import type { Comment } from "../types.js";

const router: RouterType = Router();

router.get("/task/:taskId", (req, res) => {
  const db = getDb();
  const { since } = req.query;

  let query = "SELECT * FROM comments WHERE task_id = ?";
  const params: string[] = [req.params.taskId];

  if (since) {
    query += " AND created_at > ?";
    params.push(since as string);
  }

  query += " ORDER BY created_at ASC";

  const comments = db.prepare(query).all(...params) as CommentRow[];
  res.json(comments.map(rowToComment));
});

router.post("/task/:taskId", (req, res) => {
  const { author, content } = req.body;

  if (!author || !content) {
    res.status(400).json({ error: "author and content are required" });
    return;
  }

  if (author !== "user" && author !== "claude") {
    res.status(400).json({ error: "author must be 'user' or 'claude'" });
    return;
  }

  const db = getDb();
  const taskId = req.params.taskId;

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const id = nanoid();
  db.prepare(`
    INSERT INTO comments (id, task_id, author, content)
    VALUES (?, ?, ?, ?)
  `).run(id, taskId, author, content);

  if (author === "claude") {
    updateProjectHeartbeatForTask(taskId);
  }

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as CommentRow;
  res.status(201).json(rowToComment(comment));
});

router.delete("/:commentId", (req, res) => {
  const db = getDb();
  const commentId = req.params.commentId;

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId) as CommentRow | undefined;

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  if (comment.seen) {
    res.status(400).json({ error: "Cannot delete a comment that has been seen" });
    return;
  }

  db.prepare("DELETE FROM comments WHERE id = ?").run(commentId);
  res.status(204).send();
});

router.patch("/:commentId/seen", (req, res) => {
  const db = getDb();
  const commentId = req.params.commentId;

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId) as CommentRow | undefined;

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  db.prepare("UPDATE comments SET seen = 1 WHERE id = ?").run(commentId);

  const updated = db.prepare("SELECT * FROM comments WHERE id = ?").get(commentId) as CommentRow;
  res.json(rowToComment(updated));
});

router.patch("/task/:taskId/mark-seen", (req, res) => {
  const db = getDb();
  const taskId = req.params.taskId;

  db.prepare("UPDATE comments SET seen = 1 WHERE task_id = ? AND author = 'user' AND seen = 0").run(taskId);
  updateProjectHeartbeatForTask(taskId);

  const comments = db.prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC").all(taskId) as CommentRow[];
  res.json(comments.map(rowToComment));
});

router.get("/task/:taskId/wait-for-reply", async (req, res) => {
  const db = getDb();
  const taskId = req.params.taskId;
  const since = req.query.since as string | undefined;

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found", deleted: true });
    return;
  }

  const pollInterval = 1000;
  const timeout = 30000;
  const startTime = Date.now();

  const checkForReply = (): Comment | null => {
    const taskExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
    if (!taskExists) {
      return null;
    }

    let query = "SELECT * FROM comments WHERE task_id = ? AND author = 'user'";
    const params: string[] = [taskId];

    if (since) {
      query += " AND created_at > ?";
      params.push(since);
    }

    query += " ORDER BY created_at DESC LIMIT 1";

    const row = db.prepare(query).get(...params) as CommentRow | undefined;
    return row ? rowToComment(row) : null;
  };

  const poll = () => {
    const taskExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
    if (!taskExists) {
      res.json({ deleted: true });
      return;
    }

    const reply = checkForReply();
    if (reply) {
      res.json(reply);
      return;
    }

    if (Date.now() - startTime >= timeout) {
      res.json({ timeout: true });
      return;
    }

    setTimeout(poll, pollInterval);
  };

  poll();
});

export default router;

import { Router, type Router as RouterType } from "express";
import { getDb } from "../db/index.js";

const router: RouterType = Router();

router.delete("/tasks/done", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks WHERE status = 'done'").run();
  res.json({ success: true, deleted: result.changes });
});

router.delete("/tasks/all", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks").run();
  res.json({ success: true, deleted: result.changes });
});

router.delete("/projects/all", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM projects").run();
  res.json({ success: true, deleted: result.changes });
});

router.delete("/activity/all", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM task_activity").run();
  res.json({ success: true, deleted: result.changes });
});

router.get("/stats", (_req, res) => {
  const db = getDb();

  const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  const taskCount = db.prepare("SELECT COUNT(*) as count FROM tasks").get() as { count: number };
  const tasksByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks
    GROUP BY status
  `).all() as { status: string; count: number }[];
  const commentCount = db.prepare("SELECT COUNT(*) as count FROM comments").get() as { count: number };
  const activityCount = db.prepare("SELECT COUNT(*) as count FROM task_activity").get() as { count: number };
  const templateCount = db.prepare("SELECT COUNT(*) as count FROM templates").get() as { count: number };

  res.json({
    projects: projectCount.count,
    tasks: {
      total: taskCount.count,
      byStatus: Object.fromEntries(tasksByStatus.map(row => [row.status, row.count])),
    },
    comments: commentCount.count,
    activities: activityCount.count,
    templates: templateCount.count,
  });
});

router.post("/vacuum", (_req, res) => {
  const db = getDb();
  db.exec("VACUUM");
  res.json({ success: true });
});

export default router;

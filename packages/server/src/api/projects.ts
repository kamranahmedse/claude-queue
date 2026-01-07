import { Router } from "express";
import { customAlphabet } from "nanoid";
import { getDb } from "../db/index.js";
import type { Project } from "../types.js";

const router = Router();
const generateId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

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

export default router;

import { Router, type Router as RouterType } from "express";
import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import { rowToPrompt, type PromptRow } from "../utils/mappers.js";
import type { PromptType } from "../types.js";

const router: RouterType = Router();

router.get("/master", (req, res) => {
  const db = getDb();

  const prompt = db
    .prepare("SELECT * FROM prompts WHERE type = 'master' LIMIT 1")
    .get() as PromptRow | undefined;

  if (!prompt) {
    res.json(null);
    return;
  }

  res.json(rowToPrompt(prompt));
});

router.put("/master", (req, res) => {
  const db = getDb();
  const { content } = req.body;

  if (typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const existing = db
    .prepare("SELECT * FROM prompts WHERE type = 'master' LIMIT 1")
    .get() as PromptRow | undefined;

  if (existing) {
    db.prepare(`
      UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(content, existing.id);
  } else {
    const id = nanoid();
    db.prepare(`
      INSERT INTO prompts (id, project_id, type, content)
      VALUES (?, NULL, 'master', ?)
    `).run(id, content);
  }

  const prompt = db
    .prepare("SELECT * FROM prompts WHERE type = 'master' LIMIT 1")
    .get() as PromptRow;

  res.json(rowToPrompt(prompt));
});

router.get("/project/:projectId", (req, res) => {
  const db = getDb();
  const projectId = req.params.projectId;

  const prompt = db
    .prepare("SELECT * FROM prompts WHERE type = 'project' AND project_id = ? LIMIT 1")
    .get(projectId) as PromptRow | undefined;

  if (!prompt) {
    res.json(null);
    return;
  }

  res.json(rowToPrompt(prompt));
});

router.put("/project/:projectId", (req, res) => {
  const db = getDb();
  const projectId = req.params.projectId;
  const { content } = req.body;

  if (typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const existing = db
    .prepare("SELECT * FROM prompts WHERE type = 'project' AND project_id = ? LIMIT 1")
    .get(projectId) as PromptRow | undefined;

  if (existing) {
    db.prepare(`
      UPDATE prompts SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(content, existing.id);
  } else {
    const id = nanoid();
    db.prepare(`
      INSERT INTO prompts (id, project_id, type, content)
      VALUES (?, ?, 'project', ?)
    `).run(id, projectId, content);
  }

  const prompt = db
    .prepare("SELECT * FROM prompts WHERE type = 'project' AND project_id = ? LIMIT 1")
    .get(projectId) as PromptRow;

  res.json(rowToPrompt(prompt));
});

router.delete("/project/:projectId", (req, res) => {
  const db = getDb();
  const projectId = req.params.projectId;

  db.prepare("DELETE FROM prompts WHERE type = 'project' AND project_id = ?").run(projectId);
  res.status(204).send();
});

export default router;

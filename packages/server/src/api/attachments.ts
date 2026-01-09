import { Router, type Router as RouterType } from "express";
import { nanoid } from "nanoid";
import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, extname } from "path";
import { getDb } from "../db/index.js";
import { rowToAttachment, type AttachmentRow } from "../utils/mappers.js";

const router: RouterType = Router();

const DATA_DIR = join(homedir(), ".claude-kanban");
const ATTACHMENTS_DIR = join(DATA_DIR, "attachments");

function ensureAttachmentsDir() {
  if (!existsSync(ATTACHMENTS_DIR)) {
    mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
}

router.get("/task/:taskId", (req, res) => {
  const db = getDb();
  const taskId = req.params.taskId;

  const attachments = db
    .prepare("SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC")
    .all(taskId) as AttachmentRow[];

  res.json(attachments.map(rowToAttachment));
});

router.post("/task/:taskId", (req, res) => {
  const db = getDb();
  const taskId = req.params.taskId;

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const { filename, data, mimeType } = req.body;

  if (!filename || !data || !mimeType) {
    res.status(400).json({ error: "filename, data, and mimeType are required" });
    return;
  }

  ensureAttachmentsDir();

  const id = nanoid();
  const ext = extname(filename) || ".bin";
  const storedFilename = `${id}${ext}`;
  const filePath = join(ATTACHMENTS_DIR, storedFilename);

  const buffer = Buffer.from(data, "base64");
  writeFileSync(filePath, buffer);

  db.prepare(`
    INSERT INTO attachments (id, task_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, taskId, storedFilename, filename, mimeType, buffer.length);

  const attachment = db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as AttachmentRow;
  res.status(201).json(rowToAttachment(attachment));
});

router.get("/:attachmentId/file", (req, res) => {
  const db = getDb();
  const attachmentId = req.params.attachmentId;

  const attachment = db.prepare("SELECT * FROM attachments WHERE id = ?").get(attachmentId) as AttachmentRow | undefined;

  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  const filePath = join(ATTACHMENTS_DIR, attachment.filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Content-Type", attachment.mime_type);
  res.setHeader("Content-Disposition", `inline; filename="${attachment.original_name}"`);
  res.send(readFileSync(filePath));
});

router.get("/:attachmentId/path", (req, res) => {
  const db = getDb();
  const attachmentId = req.params.attachmentId;

  const attachment = db.prepare("SELECT * FROM attachments WHERE id = ?").get(attachmentId) as AttachmentRow | undefined;

  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  const filePath = join(ATTACHMENTS_DIR, attachment.filename);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.json({ path: filePath });
});

router.delete("/:attachmentId", (req, res) => {
  const db = getDb();
  const attachmentId = req.params.attachmentId;

  const attachment = db.prepare("SELECT * FROM attachments WHERE id = ?").get(attachmentId) as AttachmentRow | undefined;

  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  const filePath = join(ATTACHMENTS_DIR, attachment.filename);

  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  db.prepare("DELETE FROM attachments WHERE id = ?").run(attachmentId);
  res.status(204).send();
});

export default router;

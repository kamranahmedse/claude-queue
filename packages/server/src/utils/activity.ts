import { nanoid } from "nanoid";
import { getDb } from "../db/index.js";
import type { TaskActivityType } from "../types.js";

export function logTaskActivity(
  taskId: string,
  type: TaskActivityType,
  oldValue: string | null = null,
  newValue: string | null = null
): void {
  const db = getDb();
  const id = nanoid();

  db.prepare(`
    INSERT INTO task_activity (id, task_id, type, old_value, new_value)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, taskId, type, oldValue, newValue);
}

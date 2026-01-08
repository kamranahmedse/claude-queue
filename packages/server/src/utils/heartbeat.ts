import { getDb } from "../db/index.js";

export function updateProjectHeartbeat(projectId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE projects SET claude_last_seen = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(projectId);
}

export function updateProjectHeartbeatForTask(taskId: string): void {
  const db = getDb();
  const task = db
    .prepare("SELECT project_id FROM tasks WHERE id = ?")
    .get(taskId) as { project_id: string } | undefined;

  if (task) {
    updateProjectHeartbeat(task.project_id);
  }
}

import type { Task, Comment, TaskStatus, TaskActivity, TaskActivityType } from "../types.js";

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  blocked: number;
  current_activity: string | null;
  starting_commit: string | null;
  started_at: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  task_id: string;
  author: "user" | "claude";
  content: string;
  seen: number;
  created_at: string;
}

export function rowToTask(row: TaskRow): Task {
  return {
    ...row,
    blocked: Boolean(row.blocked),
  };
}

export function rowToComment(row: CommentRow): Comment {
  return {
    ...row,
    seen: Boolean(row.seen),
  };
}

export interface TaskActivityRow {
  id: string;
  task_id: string;
  type: TaskActivityType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export function rowToTaskActivity(row: TaskActivityRow): TaskActivity {
  return {
    ...row,
  };
}

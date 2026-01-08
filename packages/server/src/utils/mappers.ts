import type { Task, Comment, TaskStatus } from "../types.js";

export interface TaskRow {
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

import type { Task, Comment, TaskStatus, TaskActivity, TaskActivityType, Attachment, Prompt, PromptType } from "../types.js";

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

export interface AttachmentRow {
  id: string;
  task_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    ...row,
  };
}

export interface PromptRow {
  id: string;
  project_id: string | null;
  type: PromptType;
  content: string;
  created_at: string;
  updated_at: string;
}

export function rowToPrompt(row: PromptRow): Prompt {
  return {
    ...row,
  };
}

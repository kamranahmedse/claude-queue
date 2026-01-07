export interface Project {
  id: string;
  path: string;
  name: string;
  paused: boolean;
  created_at: string;
}

export type TaskStatus = "backlog" | "ready" | "in_progress" | "done";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  blocked: boolean;
  current_activity: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author: "user" | "claude";
  content: string;
  created_at: string;
}

export interface TaskWithComments extends Task {
  comments: Comment[];
}

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "ready", title: "Ready" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

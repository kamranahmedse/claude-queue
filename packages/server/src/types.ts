export interface Project {
  id: string;
  path: string;
  name: string;
  paused: boolean;
  claude_last_seen: string | null;
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
  seen: boolean;
  created_at: string;
}

export interface TaskWithComments extends Task {
  comments: Comment[];
}

export interface Template {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
}

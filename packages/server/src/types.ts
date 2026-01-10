export interface Project {
  id: string;
  path: string;
  name: string;
  paused: boolean;
  claude_last_seen: string | null;
  created_at: string;
}

export type TaskStatus = "backlog" | "ready" | "in_progress" | "done";

export type PendingAction = "cancel" | "reset" | null;

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  blocked: boolean;
  current_activity: string | null;
  starting_commit: string | null;
  started_at: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  pending_action: PendingAction;
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

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export type TaskActivityType =
  | "created"
  | "status_change"
  | "title_change"
  | "description_change"
  | "blocked_change"
  | "comment_added";

export interface TaskActivity {
  id: string;
  task_id: string;
  type: TaskActivityType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface TaskWithActivities extends TaskWithComments {
  activities: TaskActivity[];
}

export type PromptType = "master" | "project";

export interface Prompt {
  id: string;
  project_id: string | null;
  type: PromptType;
  content: string;
  created_at: string;
  updated_at: string;
}

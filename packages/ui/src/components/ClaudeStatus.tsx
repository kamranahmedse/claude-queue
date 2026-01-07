import { Bot, Loader2, Moon, AlertCircle } from "lucide-react";
import type { Task, Project } from "~/types";

interface ClaudeStatusProps {
  project: Project | null;
  tasks: Task[];
}

export function ClaudeStatus(props: ClaudeStatusProps) {
  const { project, tasks } = props;

  if (!project) {
    return null;
  }

  const inProgressTask = tasks.find((t) => t.status === "in_progress");
  const readyTasks = tasks.filter((t) => t.status === "ready");

  const getStatus = () => {
    if (project.paused) {
      return {
        icon: <Moon className="w-3.5 h-3.5" />,
        label: "Paused",
        color: "text-zinc-500",
        bgColor: "bg-zinc-800",
        description: "Claude is paused. Click Resume to continue.",
      };
    }

    if (inProgressTask) {
      if (inProgressTask.blocked) {
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: "Blocked",
          color: "text-red-400",
          bgColor: "bg-red-900/20",
          description: inProgressTask.current_activity || "Waiting for your response",
        };
      }
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        label: "Working",
        color: "text-green-400",
        bgColor: "bg-green-900/20",
        description: inProgressTask.current_activity || "Processing task...",
      };
    }

    if (readyTasks.length > 0) {
      return {
        icon: <Bot className="w-3.5 h-3.5" />,
        label: "Ready",
        color: "text-blue-400",
        bgColor: "bg-blue-900/20",
        description: `${readyTasks.length} task${readyTasks.length > 1 ? "s" : ""} ready for pickup`,
      };
    }

    return {
      icon: <Bot className="w-3.5 h-3.5" />,
      label: "Idle",
      color: "text-zinc-500",
      bgColor: "bg-zinc-800",
      description: "Add tasks to the Ready column to start",
    };
  };

  const status = getStatus();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor}`}
      title={status.description}
    >
      <span className={status.color}>{status.icon}</span>
      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
    </div>
  );
}

import { useState } from "react";
import { Bot, Loader2, Moon, AlertCircle, ChevronDown, AlertTriangle } from "lucide-react";
import type { Task, Project } from "~/types";

interface ClaudeStatusProps {
  project: Project | null;
  tasks: Task[];
}

interface StatusInfo {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  action?: string;
  command?: string;
  details?: string;
}

const HEARTBEAT_TIMEOUT_MS = 120000;
const SKILL_COMMAND = import.meta.env.DEV ? "/kanban-dev" : "/kanban";

function isClaudeConnected(project: Project): boolean {
  if (!project.claude_last_seen) {
    return false;
  }
  const lastSeen = new Date(project.claude_last_seen).getTime();
  const now = Date.now();
  return now - lastSeen < HEARTBEAT_TIMEOUT_MS;
}

export function ClaudeStatus(props: ClaudeStatusProps) {
  const { project, tasks } = props;

  const [showPopover, setShowPopover] = useState(false);

  if (!project) {
    return null;
  }

  const inProgressTask = tasks.find((t) => t.status === "in_progress");
  const readyTasks = tasks.filter((t) => t.status === "ready");
  const claudeConnected = isClaudeConnected(project);

  const getStatus = (): StatusInfo => {
    if (project.paused) {
      return {
        icon: <Moon className="w-3.5 h-3.5" />,
        label: "Paused",
        color: "text-zinc-500",
        bgColor: "bg-zinc-800",
        description: "Claude is paused and will not pick up new tasks.",
        action: "Click the Resume button to allow Claude to continue working.",
        details: "Any task currently in progress will complete, but no new tasks will be claimed.",
      };
    }

    if (!claudeConnected) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        label: "Start Claude",
        color: "text-yellow-400",
        bgColor: "bg-yellow-900/20",
        description: "Claude is not running. Start the kanban loop to process tasks.",
        action: "Run this command in Claude Code:",
        command: `${SKILL_COMMAND} ${project.id}`,
        details: readyTasks.length > 0
          ? `${readyTasks.length} task${readyTasks.length > 1 ? "s" : ""} waiting to be picked up.`
          : "Claude will automatically pick up tasks from the Ready column.",
      };
    }

    if (inProgressTask) {
      if (inProgressTask.blocked) {
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: "Blocked",
          color: "text-red-400",
          bgColor: "bg-red-900/20",
          description: "Claude is waiting for your response.",
          action: "Click on the task and reply to Claude's question to continue.",
          details: inProgressTask.current_activity || "Check the task for Claude's question.",
        };
      }
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        label: "Working",
        color: "text-green-400",
        bgColor: "bg-green-900/20",
        description: "Claude is actively working on a task.",
        action: "No action needed. Claude will update status as it progresses.",
        details: inProgressTask.current_activity || `Working on: ${inProgressTask.title}`,
      };
    }

    if (readyTasks.length > 0) {
      return {
        icon: <Bot className="w-3.5 h-3.5" />,
        label: "Ready",
        color: "text-blue-400",
        bgColor: "bg-blue-900/20",
        description: `${readyTasks.length} task${readyTasks.length > 1 ? "s" : ""} ready for Claude.`,
        details: "Claude is connected and will pick up tasks automatically.",
      };
    }

    return {
      icon: <Bot className="w-3.5 h-3.5" />,
      label: "Watching",
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      description: "Claude is connected and watching for tasks.",
      action: "Drag tasks to the Ready column or create new tasks there.",
      details: "Claude will automatically pick up tasks from the Ready column.",
    };
  };

  const status = getStatus();

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor} hover:opacity-90 transition-opacity`}
      >
        <span className={status.color}>{status.icon}</span>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        <ChevronDown className={`w-3 h-3 ${status.color} transition-transform ${showPopover ? "rotate-180" : ""}`} />
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className={status.color}>{status.icon}</span>
                <span className={`font-medium ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-sm text-zinc-300">{status.description}</p>
              {status.details && (
                <p className="text-xs text-zinc-500 bg-zinc-800/50 rounded px-2 py-1.5">
                  {status.details}
                </p>
              )}
              {status.action && (
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-400">
                    <strong className="text-zinc-300">What to do: </strong>
                    {status.action}
                  </p>
                  {status.command && (
                    <code className="block text-sm font-mono bg-zinc-800 text-blue-300 px-3 py-2 rounded border border-zinc-700">
                      {status.command}
                    </code>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

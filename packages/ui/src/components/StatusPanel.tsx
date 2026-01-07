import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, CheckCircle, XCircle, AlertCircle, Server, Bot, FolderKanban, Copy, Check } from "lucide-react";
import { listProjectsOptions } from "~/queries/projects";
import { listTasksOptions } from "~/queries/tasks";
import type { Project } from "~/types";

interface StatusPanelProps {
  project: Project | null;
  onClose: () => void;
}

export function StatusPanel(props: StatusPanelProps) {
  const { project, onClose } = props;

  const [copied, setCopied] = useState(false);

  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useQuery(listProjectsOptions());
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    ...listTasksOptions(project?.id || ""),
    enabled: !!project,
  });

  const serverConnected = !projectsError;
  const inProgressTask = tasks.find((t) => t.status === "in_progress");
  const readyTasks = tasks.filter((t) => t.status === "ready");

  const getClaudeStatus = () => {
    if (!project) {
      return { status: "No project selected", color: "text-zinc-500", icon: XCircle };
    }
    if (project.paused) {
      return { status: "Paused", color: "text-yellow-400", icon: AlertCircle };
    }
    if (inProgressTask) {
      if (inProgressTask.blocked) {
        return { status: "Blocked - waiting for response", color: "text-red-400", icon: AlertCircle };
      }
      return { status: "Working on task", color: "text-green-400", icon: CheckCircle };
    }
    if (readyTasks.length > 0) {
      return { status: `${readyTasks.length} task(s) ready for pickup`, color: "text-blue-400", icon: AlertCircle };
    }
    return { status: "Idle - no tasks ready", color: "text-zinc-500", icon: XCircle };
  };

  const claudeStatus = getClaudeStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">System Status</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-zinc-500" />
            <div className="flex-1">
              <div className="text-sm text-zinc-300">Server Connection</div>
              <div className="text-xs text-zinc-500">Kanban backend server</div>
            </div>
            <div className="flex items-center gap-2">
              {projectsLoading ? (
                <span className="text-xs text-zinc-500">Checking...</span>
              ) : serverConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-zinc-500" />
            <div className="flex-1">
              <div className="text-sm text-zinc-300">Projects</div>
              <div className="text-xs text-zinc-500">Registered kanban boards</div>
            </div>
            <div className="flex items-center gap-2">
              {projectsLoading ? (
                <span className="text-xs text-zinc-500">Loading...</span>
              ) : (
                <>
                  {projects.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`text-xs ${projects.length > 0 ? "text-green-400" : "text-yellow-400"}`}>
                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-zinc-500" />
            <div className="flex-1">
              <div className="text-sm text-zinc-300">Claude Agent</div>
              <div className="text-xs text-zinc-500">
                {project ? `Project: ${project.name}` : "Select a project"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tasksLoading ? (
                <span className="text-xs text-zinc-500">Loading...</span>
              ) : (
                <>
                  <claudeStatus.icon className={`w-4 h-4 ${claudeStatus.color}`} />
                  <span className={`text-xs ${claudeStatus.color}`}>{claudeStatus.status}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {project && inProgressTask && (
          <div className="px-4 pb-4">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-1">Current Task</div>
              <div className="text-sm text-zinc-300 truncate">{inProgressTask.title}</div>
              {inProgressTask.current_activity && (
                <div className="text-xs text-zinc-500 mt-1 truncate">
                  {inProgressTask.current_activity}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-zinc-800 space-y-4">
          <div>
            <h3 className="text-xs font-medium text-zinc-300 mb-3">How to Start Working</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs text-zinc-400 shrink-0">1</span>
                <div className="text-xs text-zinc-500">
                  Create tasks by clicking <span className="text-zinc-300">+ Add task</span> in the Ready column
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs text-zinc-400 shrink-0">2</span>
                <div className="text-xs text-zinc-500">
                  Run this command in Claude Code to start:
                  {project && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`/kanban ${project.id}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="mt-2 w-full flex items-center justify-between gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors group"
                    >
                      <code className="text-xs text-orange-400 font-mono">/kanban {project.id}</code>
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs text-zinc-400 shrink-0">3</span>
                <div className="text-xs text-zinc-500">
                  Claude will automatically pick up tasks from Ready and work through them
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

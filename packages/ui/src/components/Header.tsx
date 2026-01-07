import { Pause, Play, Rocket } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePauseProject, useResumeProject } from "~/queries/projects";
import { listTasksOptions } from "~/queries/tasks";
import { ClaudeStatus } from "./ClaudeStatus";
import type { Project } from "~/types";

const HEARTBEAT_TIMEOUT_MS = 30000;

function isClaudeConnected(project: Project): boolean {
  if (!project.claude_last_seen) {
    return false;
  }
  const lastSeen = new Date(project.claude_last_seen).getTime();
  const now = Date.now();
  return now - lastSeen < HEARTBEAT_TIMEOUT_MS;
}

interface HeaderProps {
  project: Project | null;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
  onStatusClick: () => void;
}

export function Header(props: HeaderProps) {
  const { project, projects, onProjectChange, onStatusClick } = props;

  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const pauseProject = usePauseProject();
  const resumeProject = useResumeProject();

  const { data: tasks = [] } = useQuery({
    ...listTasksOptions(project?.id || ""),
    enabled: !!project,
    refetchInterval: 2000,
  });

  const handlePauseClick = () => {
    if (!project) {
      return;
    }
    if (project.paused) {
      resumeProject.mutate(project.id);
    } else {
      setShowPauseConfirm(true);
    }
  };

  const handleConfirmPause = () => {
    if (!project) {
      return;
    }
    pauseProject.mutate(project.id, {
      onSuccess: () => setShowPauseConfirm(false),
    });
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-zinc-300">claude-kanban</h1>
          {projects.length > 0 && (
            <select
              value={project?.id || ""}
              onChange={(e) => onProjectChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ClaudeStatus project={project} tasks={tasks} />
          <button
            onClick={onStatusClick}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded-lg transition-colors"
            title="View setup guide and system status"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>How to Start</span>
          </button>
          {project && (project.paused || isClaudeConnected(project)) && (
            <button
              onClick={handlePauseClick}
              disabled={pauseProject.isPending || resumeProject.isPending}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                project.paused
                  ? "text-green-400 hover:text-green-300 hover:bg-green-900/20"
                  : "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
              }`}
            >
              {project.paused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause After Task</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {showPauseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowPauseConfirm(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-lg font-medium text-zinc-100 mb-3">
              Pause After Current Task?
            </h3>
            <div className="text-sm text-zinc-400 space-y-3 mb-5">
              <p>
                Claude will <strong className="text-zinc-300">finish the current task</strong> but won't pick up any new tasks after that.
              </p>
              <p>
                <strong className="text-zinc-300">To resume:</strong> Click the green "Resume" button that will appear in the same location.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPauseConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPause}
                disabled={pauseProject.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors"
              >
                {pauseProject.isPending ? "Pausing..." : "Pause After Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

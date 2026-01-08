import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { listTasksOptions, useTasksRefetchInterval } from "~/queries/tasks";
import { ClaudeStatus } from "./ClaudeStatus";
import type { Project } from "~/types";

interface HeaderProps {
  project: Project | null;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
  onHelpClick: () => void;
}

export function Header(props: HeaderProps) {
  const { project, projects, onProjectChange, onHelpClick } = props;

  const refetchInterval = useTasksRefetchInterval();
  const { data: tasks = [] } = useQuery({
    ...listTasksOptions(project?.id || ""),
    enabled: !!project,
    refetchInterval,
  });

  return (
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
      <div className="flex items-center gap-3">
        <ClaudeStatus project={project} tasks={tasks} />
        <button
          onClick={onHelpClick}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Wrench, BarChart3, Settings, ChevronDown, Play, Sparkles } from "lucide-react";
import { listTasksOptions, useTasksRefetchInterval } from "~/queries/tasks";
import { useSkillCommand } from "~/hooks/use-skill-command";
import { ClaudeStatus } from "./claude-status";
import { CopyButton } from "./copy-button";
import type { Project } from "~/types";

interface HeaderProps {
  project: Project | null;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
  onHelpClick: () => void;
  onTroubleshootClick: () => void;
  onStatsClick: () => void;
  onSettingsClick: () => void;
}

export function Header(props: HeaderProps) {
  const { project, projects, onProjectChange, onHelpClick, onTroubleshootClick, onStatsClick, onSettingsClick } = props;

  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const commandMenuRef = useRef<HTMLDivElement>(null);

  const refetchInterval = useTasksRefetchInterval();
  const { data: tasks = [] } = useQuery({
    ...listTasksOptions(project?.id || ""),
    enabled: !!project,
    refetchInterval,
  });

  const skillCommand = useSkillCommand();
  const workCommand = project ? `${skillCommand} ${project.id}` : "";
  const planCommand = project ? `${skillCommand} plan ${project.id}` : "";

  useEffect(() => {
    if (!showCommandMenu) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (commandMenuRef.current && !commandMenuRef.current.contains(event.target as Node)) {
        setShowCommandMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCommandMenu]);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium text-zinc-300">claude-queue</h1>
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
        {project && (
          <div className="relative" ref={commandMenuRef}>
            <button
              onClick={() => setShowCommandMenu(!showCommandMenu)}
              className="flex items-center gap-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 px-2 py-1 hover:bg-zinc-800 transition-colors"
            >
              <code className="text-xs font-mono text-zinc-400">
                {workCommand}
              </code>
              <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showCommandMenu ? "rotate-180" : ""}`} />
            </button>
            {showCommandMenu && (
              <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[280px]">
                <div className="p-2 border-b border-zinc-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Play className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-zinc-300 font-medium">Work Mode</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-2">Start working through tasks</p>
                  <div className="flex items-center justify-between bg-zinc-900 rounded px-2 py-1.5">
                    <code className="text-xs font-mono text-zinc-400">{workCommand}</code>
                    <CopyButton text={workCommand} />
                  </div>
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-zinc-300 font-medium">Planning Mode</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mb-2">Auto-generate tasks from a description</p>
                  <div className="flex items-center justify-between bg-zinc-900 rounded px-2 py-1.5">
                    <code className="text-xs font-mono text-zinc-400">{planCommand}</code>
                    <CopyButton text={planCommand} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {project && (
          <button
            onClick={onStatsClick}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Project Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onSettingsClick}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onTroubleshootClick}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Troubleshooting"
        >
          <Wrench className="w-4 h-4" />
        </button>
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

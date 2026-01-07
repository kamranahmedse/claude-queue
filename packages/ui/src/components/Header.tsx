import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Project } from "~/types";

interface HeaderProps {
  project: Project | null;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
}

export function Header(props: HeaderProps) {
  const { project, projects, onProjectChange } = props;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!project) {
      return;
    }
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      {project && (
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <span className="font-mono">{project.id}</span>
              <Copy className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </header>
  );
}

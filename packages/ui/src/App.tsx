import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { listProjectsOptions } from "~/queries/projects";
import { Header } from "~/components/Header";
import { Board } from "~/components/Board";
import { HelpDialog } from "~/components/HelpDialog";
import { CopyButton } from "~/components/CopyButton";

const HELP_SEEN_KEY = "claude-kanban-help-seen";

export function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(() => {
    return !localStorage.getItem(HELP_SEEN_KEY);
  });

  const { data: projects = [], isLoading } = useQuery(listProjectsOptions());

  const handleCloseHelp = () => {
    setShowHelp(false);
    localStorage.setItem(HELP_SEEN_KEY, "true");
  };

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      const urlParams = new URLSearchParams(window.location.search);
      const projectIdFromUrl = urlParams.get("project");

      if (projectIdFromUrl && projects.some((p) => p.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    const url = new URL(window.location.href);
    url.searchParams.set("project", projectId);
    window.history.replaceState({}, "", url.toString());
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-sm text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-medium text-zinc-300 mb-2">
            No projects yet
          </h1>
          <p className="text-sm text-zinc-500">
            Run the following command in a project directory to get started:
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
            <code className="text-sm text-orange-400">npx claude-kanban</code>
            <CopyButton text="npx claude-kanban" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#fafafa",
          },
        }}
      />
      <Header
        project={selectedProject}
        projects={projects}
        onProjectChange={handleProjectChange}
        onHelpClick={() => setShowHelp(true)}
      />
      {selectedProjectId && <Board projectId={selectedProjectId} />}
      {showHelp && <HelpDialog onClose={handleCloseHelp} />}
    </div>
  );
}

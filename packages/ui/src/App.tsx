import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { listProjectsOptions } from "~/queries/projects";
import { Header } from "~/components/Header";
import { Board } from "~/components/Board";
import { LogViewer } from "~/components/LogViewer";

export function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const { data: projects = [], isLoading } = useQuery(listProjectsOptions());

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
            Run <code className="px-1.5 py-0.5 bg-zinc-800 rounded">npx claude-kanban</code> in a project directory to get started.
          </p>
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
        onLogsClick={() => setShowLogs(true)}
      />
      {selectedProjectId && <Board projectId={selectedProjectId} />}
      {showLogs && <LogViewer onClose={() => setShowLogs(false)} />}
    </div>
  );
}

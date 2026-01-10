import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { listProjectsOptions } from "~/queries/projects";
import { listTasksOptions, useTasksRefetchInterval } from "~/queries/tasks";
import { useKeyboardShortcuts } from "~/hooks/use-keyboard-shortcuts";
import { useBlockedIndicator } from "~/hooks/use-blocked-indicator";
import { Header } from "~/components/header";
import { Board, type BoardRef } from "~/components/board";
import { HelpDialog } from "~/components/help-dialog";
import { TroubleshootingDialog } from "~/components/troubleshooting-dialog";
import { StatsDialog } from "~/components/stats-dialog";
import { SettingsDialog } from "~/components/settings-dialog";
import { CopyButton } from "~/components/copy-button";

const HELP_SEEN_KEY = "claude-queue-help-seen";

export function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(() => {
    return !localStorage.getItem(HELP_SEEN_KEY);
  });
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const boardRef = useRef<BoardRef>(null);

  const refetchInterval = useTasksRefetchInterval();
  const { data: projects = [], isLoading } = useQuery({
    ...listProjectsOptions(),
    refetchInterval,
  });
  const { data: tasks = [] } = useQuery({
    ...listTasksOptions(selectedProjectId || ""),
    enabled: !!selectedProjectId,
    refetchInterval,
  });

  const hasBlockedTask = useBlockedIndicator(tasks);

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

  const hasAnyModalOpen = showHelp || showTroubleshooting || showStats || showSettings;

  const closeAllModals = () => {
    if (showHelp) {
      handleCloseHelp();
    }
    if (showTroubleshooting) {
      setShowTroubleshooting(false);
    }
    if (showStats) {
      setShowStats(false);
    }
    if (showSettings) {
      setShowSettings(false);
    }
    boardRef.current?.closeModals();
  };

  useKeyboardShortcuts({
    onHelp: () => {
      if (hasAnyModalOpen) {
        closeAllModals();
      } else {
        setShowHelp(true);
      }
    },
    onAddTask: () => {
      if (!hasAnyModalOpen) {
        boardRef.current?.openAddTask();
      }
    },
    onAddTemplate: () => {
      if (!hasAnyModalOpen) {
        boardRef.current?.openAddTemplate();
      }
    },
    onCloseModal: closeAllModals,
    onTroubleshooting: () => {
      if (hasAnyModalOpen) {
        closeAllModals();
      } else {
        setShowTroubleshooting(true);
      }
    },
    onStats: () => {
      if (hasAnyModalOpen) {
        closeAllModals();
      } else if (selectedProject) {
        setShowStats(true);
      }
    },
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  if (!isLoading && projects.length === 0) {
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
            <code className="text-sm text-orange-400">npx claude-queue</code>
            <CopyButton text="npx claude-queue" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {hasBlockedTask && (
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500/60 to-transparent animate-pulse" />
      )}
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
        onTroubleshootClick={() => setShowTroubleshooting(true)}
        onStatsClick={() => setShowStats(true)}
        onSettingsClick={() => setShowSettings(true)}
      />
      {selectedProjectId && <Board ref={boardRef} projectId={selectedProjectId} />}
      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-zinc-500">Loading...</div>
        </div>
      )}
      {showHelp && <HelpDialog projectId={selectedProjectId} onClose={handleCloseHelp} />}
      {showTroubleshooting && (
        <TroubleshootingDialog
          project={selectedProject}
          tasks={tasks}
          onClose={() => setShowTroubleshooting(false)}
        />
      )}
      {showStats && selectedProject && (
        <StatsDialog
          project={selectedProject}
          onClose={() => setShowStats(false)}
        />
      )}
      {showSettings && (
        <SettingsDialog
          projectId={selectedProjectId}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

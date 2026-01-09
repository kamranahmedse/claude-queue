import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, Loader2 } from "lucide-react";
import { masterPromptOptions, projectPromptOptions, useUpdateMasterPrompt, useUpdateProjectPrompt } from "~/queries/prompts";

interface SettingsDialogProps {
  projectId: string | null;
  onClose: () => void;
}

type TabId = "prompts";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "prompts", label: "Prompts", icon: <FileText className="w-4 h-4" /> },
];

interface PromptsTabProps {
  projectId: string | null;
}

function PromptsTab(props: PromptsTabProps) {
  const { projectId } = props;

  const { data: masterPrompt, isLoading: masterLoading } = useQuery(masterPromptOptions());
  const { data: projectPrompt, isLoading: projectLoading } = useQuery(projectPromptOptions(projectId || ""));

  const updateMasterPrompt = useUpdateMasterPrompt();
  const updateProjectPrompt = useUpdateProjectPrompt(projectId || "");

  const [masterContent, setMasterContent] = useState("");
  const [projectContent, setProjectContent] = useState("");
  const [masterSaved, setMasterSaved] = useState(false);
  const [projectSaved, setProjectSaved] = useState(false);

  useEffect(() => {
    if (masterPrompt) {
      setMasterContent(masterPrompt.content);
    }
  }, [masterPrompt]);

  useEffect(() => {
    if (projectPrompt) {
      setProjectContent(projectPrompt.content);
    }
  }, [projectPrompt]);

  const handleSaveMaster = () => {
    updateMasterPrompt.mutate(masterContent, {
      onSuccess: () => {
        setMasterSaved(true);
        setTimeout(() => setMasterSaved(false), 2000);
      },
    });
  };

  const handleSaveProject = () => {
    if (!projectId) {
      return;
    }
    updateProjectPrompt.mutate(projectContent, {
      onSuccess: () => {
        setProjectSaved(true);
        setTimeout(() => setProjectSaved(false), 2000);
      },
    });
  };

  const masterHasChanges = masterContent !== (masterPrompt?.content || "");
  const projectHasChanges = projectContent !== (projectPrompt?.content || "");

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-200">Master Prompt</h3>
          {masterSaved && (
            <span className="text-xs text-green-400">Saved!</span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          This prompt will be included whenever Claude starts working on any task, across all projects.
        </p>
        {masterLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <textarea
              value={masterContent}
              onChange={(e) => setMasterContent(e.target.value)}
              placeholder="Enter instructions that should apply to all tasks..."
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveMaster}
                disabled={!masterHasChanges || updateMasterPrompt.isPending}
                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {updateMasterPrompt.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Master Prompt
              </button>
            </div>
          </>
        )}
      </section>

      <div className="border-t border-zinc-800" />

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-zinc-200">Project Prompt</h3>
          {projectSaved && (
            <span className="text-xs text-green-400">Saved!</span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          This prompt will be included whenever Claude starts working on tasks in the current project only.
        </p>
        {!projectId ? (
          <p className="text-sm text-zinc-500">No project selected</p>
        ) : projectLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            <textarea
              value={projectContent}
              onChange={(e) => setProjectContent(e.target.value)}
              placeholder="Enter project-specific instructions..."
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveProject}
                disabled={!projectHasChanges || updateProjectPrompt.isPending}
                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {updateProjectPrompt.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Project Prompt
              </button>
            </div>
          </>
        )}
      </section>

      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <p className="text-xs text-zinc-400">
          <strong className="text-zinc-300">How prompts work:</strong> When Claude claims a task, both the master prompt and project prompt (if set) will be included in the task context. This helps maintain consistent behavior and project-specific guidelines.
        </p>
      </div>
    </div>
  );
}

export function SettingsDialog(props: SettingsDialogProps) {
  const { projectId, onClose } = props;
  const [activeTab, setActiveTab] = useState<TabId>("prompts");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-medium text-zinc-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav className="w-44 shrink-0 border-r border-zinc-800 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
                  ${activeTab === tab.id
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }
                `}
              >
                <span className={activeTab === tab.id ? "text-orange-400" : "text-zinc-500"}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 p-4 overflow-y-auto min-h-[400px]">
            {activeTab === "prompts" && <PromptsTab projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

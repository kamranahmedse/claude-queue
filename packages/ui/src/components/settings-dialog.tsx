import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, Loader2, Settings2, Volume2, VolumeX } from "lucide-react";
import { masterPromptOptions, projectPromptOptions, useUpdateMasterPrompt, useUpdateProjectPrompt } from "~/queries/prompts";
import { useSoundEnabled } from "~/hooks/use-sound";

interface SettingsDialogProps {
  projectId: string | null;
  onClose: () => void;
}

type TabId = "general" | "prompts";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "general", label: "General", icon: <Settings2 className="w-4 h-4" /> },
  { id: "prompts", label: "Prompts", icon: <FileText className="w-4 h-4" /> },
];

function GeneralTab() {
  const [soundEnabled, setSoundEnabled] = useSoundEnabled();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Sound Notifications</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Play sound effects when tasks are started, completed, or when Claude asks a question.
        </p>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`
            flex items-center gap-3 w-full p-3 rounded-lg border transition-colors
            ${soundEnabled
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
              : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
            }
          `}
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">
              {soundEnabled ? "Sound enabled" : "Sound disabled"}
            </div>
            <div className="text-xs text-zinc-500">
              {soundEnabled ? "You'll hear sounds for task events" : "No sounds will be played"}
            </div>
          </div>
          <div
            className={`
              w-10 h-6 rounded-full transition-colors relative
              ${soundEnabled ? "bg-orange-500" : "bg-zinc-600"}
            `}
          >
            <div
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                ${soundEnabled ? "translate-x-5" : "translate-x-1"}
              `}
            />
          </div>
        </button>
      </section>
    </div>
  );
}

interface PromptEditorProps {
  title: string;
  description: string;
  content: string | null;
  isLoading: boolean;
  isPending: boolean;
  onSave: (content: string) => void;
}

function PromptEditor(props: PromptEditorProps) {
  const { title, description, content, isLoading, isPending, onSave } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const handleStartEdit = () => {
    setEditContent(content || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">{title}</h3>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </section>
    );
  }

  if (isEditing) {
    return (
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">{title}</h3>
        <p className="text-xs text-zinc-500 mb-3">{description}</p>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Enter instructions..."
          rows={6}
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        {showSaved && <span className="text-xs text-green-400">Saved!</span>}
      </div>
      <p className="text-xs text-zinc-500 mb-3">{description}</p>
      {content ? (
        <div
          onClick={handleStartEdit}
          className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors group"
        >
          <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">{content}</p>
          <p className="text-xs text-zinc-500 mt-2 group-hover:text-zinc-400">Click to edit</p>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className="w-full p-3 border border-dashed border-zinc-700 rounded-lg text-sm text-zinc-500 hover:text-zinc-400 hover:border-zinc-600 transition-colors"
        >
          + Add {title.toLowerCase()}
        </button>
      )}
    </section>
  );
}

interface PromptsTabProps {
  projectId: string | null;
}

function PromptsTab(props: PromptsTabProps) {
  const { projectId } = props;

  const { data: masterPrompt, isLoading: masterLoading } = useQuery(masterPromptOptions());
  const { data: projectPrompt, isLoading: projectLoading } = useQuery(projectPromptOptions(projectId || ""));

  const updateMasterPrompt = useUpdateMasterPrompt();
  const updateProjectPrompt = useUpdateProjectPrompt(projectId || "");

  return (
    <div className="space-y-6">
      <PromptEditor
        title="Master Prompt"
        description="This prompt will be included whenever Claude starts working on any task, across all projects."
        content={masterPrompt?.content || null}
        isLoading={masterLoading}
        isPending={updateMasterPrompt.isPending}
        onSave={(content) => updateMasterPrompt.mutate(content)}
      />

      <div className="border-t border-zinc-800" />

      {projectId ? (
        <PromptEditor
          title="Project Prompt"
          description="This prompt will be included whenever Claude starts working on tasks in the current project only."
          content={projectPrompt?.content || null}
          isLoading={projectLoading}
          isPending={updateProjectPrompt.isPending}
          onSave={(content) => updateProjectPrompt.mutate(content)}
        />
      ) : (
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-2">Project Prompt</h3>
          <p className="text-sm text-zinc-500">No project selected</p>
        </section>
      )}

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
  const [activeTab, setActiveTab] = useState<TabId>("general");

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
            {activeTab === "general" && <GeneralTab />}
            {activeTab === "prompts" && <PromptsTab projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

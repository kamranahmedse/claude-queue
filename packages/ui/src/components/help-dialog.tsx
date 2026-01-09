import { useState } from "react";
import { X, Rocket, GitBranch, MessageCircle, Lightbulb, Inbox, CheckCircle2, Clock, CheckCheck, FileText, Keyboard } from "lucide-react";
import { CopyButton } from "./copy-button";
import { useSkillCommand } from "~/hooks/use-skill-command";

interface HelpDialogProps {
  projectId: string | null;
  onClose: () => void;
}

type TabId = "overview" | "workflow" | "interaction" | "shortcuts" | "tips";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Rocket className="w-4 h-4" /> },
  { id: "workflow", label: "Workflow", icon: <GitBranch className="w-4 h-4" /> },
  { id: "interaction", label: "Interaction", icon: <MessageCircle className="w-4 h-4" /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
  { id: "tips", label: "Tips", icon: <Lightbulb className="w-4 h-4" /> },
];

interface OverviewTabProps {
  projectId: string | null;
  skillCommand: string;
}

function OverviewTab(props: OverviewTabProps) {
  const { projectId, skillCommand } = props;
  const fullCommand = projectId ? `${skillCommand} ${projectId}` : `${skillCommand} <project-id>`;

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">What is claude-queue?</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          A visual task board that lets you assign tasks to Claude Code.
          Add tasks to the board, and Claude will work through them autonomously.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Quick Start</h3>
        <ol className="space-y-4 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-medium">1</span>
            <span>Add tasks to <strong className="text-zinc-300">Backlog</strong> or <strong className="text-zinc-300">Ready</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-medium">2</span>
            <span>Run the skill command in Claude Code:</span>
          </li>
        </ol>
        <div className="mt-3 ml-9 flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            {fullCommand}
          </code>
          <CopyButton text={fullCommand} className="mr-2" />
        </div>
        {!projectId && (
          <p className="mt-2 ml-9 text-xs text-zinc-500">
            Find your project ID in the URL or header
          </p>
        )}
      </section>
    </div>
  );
}

function WorkflowTab() {
  const columns = [
    { icon: <Inbox className="w-4 h-4" />, name: "Backlog", desc: "Tasks waiting to be prioritized", color: "text-zinc-400" },
    { icon: <CheckCircle2 className="w-4 h-4" />, name: "Ready", desc: "Tasks ready for Claude to pick up", color: "text-green-400" },
    { icon: <Clock className="w-4 h-4" />, name: "In Progress", desc: "Claude is actively working", color: "text-orange-400" },
    { icon: <CheckCheck className="w-4 h-4" />, name: "Done", desc: "Completed tasks", color: "text-blue-400" },
  ];

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Task Columns</h3>
        <div className="space-y-3">
          {columns.map((col) => (
            <div key={col.name} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
              <div className={`shrink-0 ${col.color}`}>{col.icon}</div>
              <div>
                <div className="text-sm font-medium text-zinc-200">{col.name}</div>
                <div className="text-xs text-zinc-500">{col.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Templates</h3>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50">
          <div className="shrink-0 text-indigo-400"><FileText className="w-4 h-4" /></div>
          <div>
            <div className="text-sm font-medium text-zinc-200">Reusable task templates</div>
            <div className="text-xs text-zinc-500">Drag a template to Backlog or Ready to create a task</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InteractionTab() {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Interacting with Claude</h3>
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3 p-3 rounded-lg bg-zinc-800/50">
            <MessageCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span>Click any task to view details and add comments</span>
          </li>
          <li className="flex gap-3 p-3 rounded-lg bg-zinc-800/50">
            <Clock className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
            <span>When Claude is blocked, it will wait for your reply</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Task Controls</h3>
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3 p-3 rounded-lg bg-zinc-800/50">
            <span className="shrink-0 text-yellow-400 text-xs font-medium">Start Over</span>
            <span className="text-zinc-500">— Reset task and discard changes</span>
          </li>
          <li className="flex gap-3 p-3 rounded-lg bg-zinc-800/50">
            <span className="shrink-0 text-red-400 text-xs font-medium">Abort Task</span>
            <span className="text-zinc-500">— Cancel and move to backlog</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function ShortcutsTab() {
  const shortcuts = [
    { keys: ["?", "H"], description: "Toggle help dialog" },
    { keys: ["N", "A"], description: "Add new task to Ready" },
    { keys: ["T"], description: "Add new template" },
    { keys: ["D"], description: "Open troubleshooting dialog" },
    { keys: ["S"], description: "Open statistics dialog" },
    { keys: ["Esc"], description: "Close any open dialog" },
  ];

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
            >
              <span className="text-sm text-zinc-400">{shortcut.description}</span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1.5">
                    {keyIndex > 0 && <span className="text-zinc-600 text-xs">or</span>}
                    <kbd className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-300 rounded border border-zinc-600">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Shortcuts are disabled when typing in input fields.
        </p>
      </section>
    </div>
  );
}

function TipsTab() {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Multiple Projects</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Run <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-400 text-xs">npx claude-queue</code> in
          different directories to create separate boards. Switch projects using the header dropdown.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Status Indicator</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The header shows Claude's status — working, idle, or waiting for a reply.
          If tasks aren't being picked up, ensure the queue skill is running.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Drag & Drop</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Reorder tasks by dragging them within or between columns.
          Note: In Progress tasks are locked while Claude works on them.
        </p>
      </section>
    </div>
  );
}

export function HelpDialog(props: HelpDialogProps) {
  const { projectId, onClose } = props;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const skillCommand = useSkillCommand();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-medium text-zinc-100">Getting Started</h2>
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

          <div className="flex-1 p-4 overflow-y-auto min-h-[550px]">
            {activeTab === "overview" && <OverviewTab projectId={projectId} skillCommand={skillCommand} />}
            {activeTab === "workflow" && <WorkflowTab />}
            {activeTab === "interaction" && <InteractionTab />}
            {activeTab === "shortcuts" && <ShortcutsTab />}
            {activeTab === "tips" && <TipsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

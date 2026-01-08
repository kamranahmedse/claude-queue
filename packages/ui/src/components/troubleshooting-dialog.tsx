import { useState } from "react";
import { X, Activity, Puzzle, Server, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, Wrench, Trash2, Database, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { httpDelete, httpGet, httpPost } from "~/lib/http";
import { CopyButton } from "./copy-button";
import { ConfirmDialog } from "./confirm-dialog";
import type { Project, Task } from "~/types";

interface TroubleshootingDialogProps {
  project: Project | null;
  tasks: Task[];
  onClose: () => void;
}

const SKILL_COMMAND = import.meta.env.DEV ? "/kanban-dev" : "/kanban";
const MCP_NAME = import.meta.env.DEV ? "claude-kanban-dev" : "claude-kanban";
const PORT = import.meta.env.DEV ? "3334" : "3333";

type TabId = "status" | "skills" | "mcp" | "issues" | "actions";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "status", label: "Status", icon: <Activity className="w-4 h-4" /> },
  { id: "skills", label: "Skills", icon: <Puzzle className="w-4 h-4" /> },
  { id: "mcp", label: "MCP Server", icon: <Server className="w-4 h-4" /> },
  { id: "issues", label: "Common Issues", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "actions", label: "Actions", icon: <Wrench className="w-4 h-4" /> },
];

interface StatusItemProps {
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
}

function StatusItem(props: StatusItemProps) {
  const { label, status, message } = props;

  const statusIcons = {
    ok: <CheckCircle className="w-4 h-4 text-green-400" />,
    warning: <Clock className="w-4 h-4 text-yellow-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
  };

  const statusColors = {
    ok: "border-green-500/30 bg-green-900/10",
    warning: "border-yellow-500/30 bg-yellow-900/10",
    error: "border-red-500/30 bg-red-900/10",
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${statusColors[status]}`}>
      <div className="shrink-0 mt-0.5">{statusIcons[status]}</div>
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{message}</div>
      </div>
    </div>
  );
}

interface StatusTabProps {
  project: Project | null;
  tasks: Task[];
}

function StatusTab(props: StatusTabProps) {
  const { project, tasks } = props;

  const inProgressTask = tasks.find((t) => t.status === "in_progress");
  const readyTasks = tasks.filter((t) => t.status === "ready");

  const getClaudeStatus = (): StatusItemProps => {
    if (!project) {
      return { label: "Claude Connection", status: "error", message: "No project selected" };
    }

    if (inProgressTask) {
      if (inProgressTask.blocked) {
        return { label: "Claude Connection", status: "warning", message: "Claude is blocked and waiting for your reply" };
      }
      return { label: "Claude Connection", status: "ok", message: `Working on: ${inProgressTask.title}` };
    }

    if (project.claude_last_seen) {
      const lastSeen = new Date(project.claude_last_seen);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);

      if (diffSeconds < 30) {
        return { label: "Claude Connection", status: "ok", message: "Claude is connected and watching" };
      } else if (diffSeconds < 300) {
        const minutes = Math.floor(diffSeconds / 60);
        return { label: "Claude Connection", status: "warning", message: `Last seen ${minutes}m ago. Claude may have stopped.` };
      }
    }

    return { label: "Claude Connection", status: "error", message: "Claude is not connected. Run the skill command." };
  };

  const getServerStatus = (): StatusItemProps => {
    return { label: "Server", status: "ok", message: `Running on port ${PORT}` };
  };

  const getTasksStatus = (): StatusItemProps => {
    if (readyTasks.length > 0) {
      return { label: "Ready Tasks", status: "ok", message: `${readyTasks.length} task(s) ready for Claude` };
    }
    return { label: "Ready Tasks", status: "warning", message: "No tasks in Ready column. Add tasks for Claude to work on." };
  };

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-3">System Status</h3>
        <div className="space-y-2">
          <StatusItem {...getServerStatus()} />
          <StatusItem {...getClaudeStatus()} />
          <StatusItem {...getTasksStatus()} />
        </div>
      </section>

      {project && (
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Project Info</h3>
          <div className="p-3 rounded-lg bg-zinc-800/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Project ID</span>
              <span className="text-zinc-300 font-mono">{project.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Name</span>
              <span className="text-zinc-300">{project.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Path</span>
              <span className="text-zinc-300 truncate max-w-[200px]" title={project.path}>{project.path}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

interface SkillsTabProps {
  projectId: string | null;
}

function SkillsTab(props: SkillsTabProps) {
  const { projectId } = props;
  const fullCommand = projectId ? `${SKILL_COMMAND} ${projectId}` : `${SKILL_COMMAND} <project-id>`;

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Check Skill Installation</h3>
        <p className="text-sm text-zinc-400 mb-3">
          Skills should be installed at <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 text-xs">~/.claude/skills/{SKILL_COMMAND.slice(1)}/</code>
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            ls ~/.claude/skills/{SKILL_COMMAND.slice(1)}/
          </code>
          <CopyButton text={`ls ~/.claude/skills/${SKILL_COMMAND.slice(1)}/`} className="mr-2" />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          You should see <code className="text-zinc-400">SKILL.md</code> in the output.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Reinstall Skills</h3>
        <p className="text-sm text-zinc-400 mb-3">
          If the skill is missing or outdated, reinstall with:
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            npx claude-kanban
          </code>
          <CopyButton text="npx claude-kanban" className="mr-2" />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          This will reinstall the skill if it's missing.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Run the Skill</h3>
        <p className="text-sm text-zinc-400 mb-3">
          In Claude Code, run:
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            {fullCommand}
          </code>
          <CopyButton text={fullCommand} className="mr-2" />
        </div>
      </section>
    </div>
  );
}

function McpTab() {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Check MCP Configuration</h3>
        <p className="text-sm text-zinc-400 mb-3">
          MCP servers are configured in <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-400 text-xs">~/.claude/settings.json</code>
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            cat ~/.claude/settings.json | grep -A5 "{MCP_NAME}"
          </code>
          <CopyButton text={`cat ~/.claude/settings.json | grep -A5 "${MCP_NAME}"`} className="mr-2" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Expected Configuration</h3>
        <p className="text-sm text-zinc-400 mb-3">
          You should see something like:
        </p>
        <pre className="p-3 rounded-lg bg-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{`"${MCP_NAME}": {
  "command": "npx",
  "args": ["-y", "-p", "claude-kanban", "claude-kanban-mcp"],
  "env": {
    "KANBAN_SERVER_URL": "http://localhost:${PORT}"
  }
}`}
        </pre>
      </section>

      <section>
        <h3 className="text-sm font-medium text-zinc-200 mb-2">Reconfigure MCP</h3>
        <p className="text-sm text-zinc-400 mb-3">
          If the MCP server is missing or misconfigured, run:
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700">
          <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2.5">
            npx claude-kanban
          </code>
          <CopyButton text="npx claude-kanban" className="mr-2" />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Then restart Claude Code to load the new MCP server.
        </p>
      </section>
    </div>
  );
}

interface AccordionItemProps {
  question: string;
  answers: string[];
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem(props: AccordionItemProps) {
  const { question, answers, isOpen, onToggle } = props;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-3 text-left bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
      >
        <span className="text-sm font-medium text-zinc-100">{question}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-400 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="p-3 border-t border-zinc-800">
          <ul className="space-y-2 text-sm text-zinc-400">
            {answers.map((answer, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">•</span>
                <span>{answer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface MaintenanceStats {
  projects: number;
  tasks: {
    total: number;
    byStatus: Record<string, number>;
  };
  comments: number;
  activities: number;
  templates: number;
}

interface ActionButtonProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: "danger" | "warning" | "info";
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton(props: ActionButtonProps) {
  const { label, description, icon, variant, onClick, disabled } = props;

  const variantClasses = {
    danger: "border-red-500/30 bg-red-900/10 hover:bg-red-900/20 text-red-400",
    warning: "border-yellow-500/30 bg-yellow-900/10 hover:bg-yellow-900/20 text-yellow-400",
    info: "border-zinc-500/30 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${variantClasses[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs opacity-70 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function ActionsTab() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const loadStats = async () => {
    const data = await httpGet<MaintenanceStats>("/maintenance/stats");
    setStats(data);
  };

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
      await loadStats();
      queryClient.invalidateQueries();
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const clearDoneTasks = () => {
    setConfirmAction({
      title: "Clear Done Tasks",
      message: `This will delete all tasks in the "Done" column across all projects. This cannot be undone.`,
      action: async () => {
        await httpDelete("/maintenance/tasks/done");
      },
    });
  };

  const clearAllTasks = () => {
    setConfirmAction({
      title: "Clear All Tasks",
      message: "This will delete ALL tasks from ALL projects. This cannot be undone.",
      action: async () => {
        await httpDelete("/maintenance/tasks/all");
      },
    });
  };

  const clearAllProjects = () => {
    setConfirmAction({
      title: "Clear All Projects",
      message: "This will delete ALL projects and their tasks. This cannot be undone.",
      action: async () => {
        await httpDelete("/maintenance/projects/all");
      },
    });
  };

  const clearActivityLog = () => {
    setConfirmAction({
      title: "Clear Activity Log",
      message: "This will delete all activity history from all tasks. This cannot be undone.",
      action: async () => {
        await httpDelete("/maintenance/activity/all");
      },
    });
  };

  const vacuumDatabase = async () => {
    setLoading(true);
    try {
      await httpPost("/maintenance/vacuum", {});
      alert("Database optimized successfully");
    } finally {
      setLoading(false);
    }
  };

  if (stats === null) {
    loadStats();
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Database Stats</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <div className="text-lg font-medium text-zinc-200">{stats.projects}</div>
              <div className="text-xs text-zinc-500">Projects</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <div className="text-lg font-medium text-zinc-200">{stats.tasks.total}</div>
              <div className="text-xs text-zinc-500">Tasks</div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
              <div className="text-lg font-medium text-zinc-200">{stats.tasks.byStatus.done || 0}</div>
              <div className="text-xs text-zinc-500">Done</div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Cleanup Actions</h3>
          <div className="space-y-2">
            <ActionButton
              label="Clear Done Tasks"
              description={`Delete all completed tasks (${stats.tasks.byStatus.done || 0} tasks)`}
              icon={<Trash2 className="w-4 h-4" />}
              variant="warning"
              onClick={clearDoneTasks}
              disabled={loading || !stats.tasks.byStatus.done}
            />
            <ActionButton
              label="Clear Activity Log"
              description={`Delete all activity history (${stats.activities} entries)`}
              icon={<Activity className="w-4 h-4" />}
              variant="warning"
              onClick={clearActivityLog}
              disabled={loading || stats.activities === 0}
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Destructive Actions</h3>
          <div className="space-y-2">
            <ActionButton
              label="Clear All Tasks"
              description={`Delete all tasks from all projects (${stats.tasks.total} tasks)`}
              icon={<Trash2 className="w-4 h-4" />}
              variant="danger"
              onClick={clearAllTasks}
              disabled={loading || stats.tasks.total === 0}
            />
            <ActionButton
              label="Clear All Projects"
              description={`Delete all projects and their data (${stats.projects} projects)`}
              icon={<Trash2 className="w-4 h-4" />}
              variant="danger"
              onClick={clearAllProjects}
              disabled={loading || stats.projects === 0}
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Database Maintenance</h3>
          <ActionButton
            label="Optimize Database"
            description="Run VACUUM to reclaim space and optimize performance"
            icon={<Database className="w-4 h-4" />}
            variant="info"
            onClick={vacuumDatabase}
            disabled={loading}
          />
        </section>
      </div>

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Delete"
          isLoading={loading}
          onConfirm={() => handleAction(confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

function IssuesTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const issues = [
    {
      problem: "Tasks not being picked up",
      solutions: [
        "Ensure tasks are in the \"Ready\" column (not Backlog)",
        "Check that Claude is connected (see Status tab)",
        `Run ${SKILL_COMMAND} <project-id> in Claude Code`,
        "Make sure there's no task already in progress",
      ],
    },
    {
      problem: "Claude shows as disconnected",
      solutions: [
        `Run the skill command: ${SKILL_COMMAND} <project-id>`,
        "Restart Claude Code and try again",
        "Check that the MCP server is configured (see MCP Server tab)",
      ],
    },
    {
      problem: '"Skill not found" error',
      solutions: [
        "Run `npx claude-kanban` to reinstall skills",
        "Check ~/.claude/skills/ directory exists",
        "Restart Claude Code after installing",
      ],
    },
    {
      problem: "MCP server connection errors",
      solutions: [
        "Ensure the kanban server is running (check this page loads)",
        "Restart Claude Code to reload MCP servers",
        "Check ~/.claude/settings.json has the MCP config",
      ],
    },
    {
      problem: "Changes not appearing in real-time",
      solutions: [
        "The board auto-refreshes every few seconds",
        "Try refreshing the page manually",
        "Check browser console for errors",
      ],
    },
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-2">
      {issues.map((issue, index) => (
        <AccordionItem
          key={index}
          question={issue.problem}
          answers={issue.solutions}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        />
      ))}
    </div>
  );
}

export function TroubleshootingDialog(props: TroubleshootingDialogProps) {
  const { project, tasks, onClose } = props;
  const [activeTab, setActiveTab] = useState<TabId>("status");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base font-medium text-zinc-100">Troubleshooting</h2>
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

          <div className="flex-1 p-4 overflow-y-auto min-h-[450px]">
            {activeTab === "status" && <StatusTab project={project} tasks={tasks} />}
            {activeTab === "skills" && <SkillsTab projectId={project?.id || null} />}
            {activeTab === "mcp" && <McpTab />}
            {activeTab === "issues" && <IssuesTab />}
            {activeTab === "actions" && <ActionsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

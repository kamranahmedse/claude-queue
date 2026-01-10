import { useState, type ReactNode } from "react";
import { Loader2, AlertCircle, ChevronDown, Terminal, Play, ListTodo } from "lucide-react";
import { CopyButton } from "./copy-button";
import { useSkillCommand } from "~/hooks/use-skill-command";
import type { Task, Project } from "~/types";

interface ClaudeStatusProps {
  project: Project | null;
  tasks: Task[];
}

interface CommandOption {
  label: string;
  description: string;
  command: string;
  icon: ReactNode;
}

export function ClaudeStatus(props: ClaudeStatusProps) {
  const { project, tasks } = props;

  const [showPopover, setShowPopover] = useState(false);
  const skillCommand = useSkillCommand();

  if (!project) {
    return null;
  }

  const inProgressTask = tasks.find((t) => t.status === "in_progress");

  const getCommands = (): CommandOption[] => {
    return [
      {
        label: "Work on tasks",
        description: "Start working through ready tasks",
        command: `${skillCommand} ${project.id}`,
        icon: <Play className="w-3.5 h-3.5" />,
      },
      {
        label: "Plan tasks",
        description: "Describe a feature and create tasks",
        command: `${skillCommand} plan ${project.id}`,
        icon: <ListTodo className="w-3.5 h-3.5" />,
      },
    ];
  };

  const getStatus = () => {
    if (inProgressTask) {
      if (inProgressTask.blocked) {
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: "Needs reply",
          color: "text-red-400",
          bgColor: "bg-red-900/20",
          description: "Claude is waiting for your response.",
          action: "Click on the task in progress and reply to Claude's question.",
        };
      }
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        label: "Working",
        color: "text-green-400",
        bgColor: "bg-green-900/20",
        description: inProgressTask.current_activity || `Working on: ${inProgressTask.title}`,
      };
    }

    return {
      icon: <Terminal className="w-3.5 h-3.5" />,
      label: "Idle",
      color: "text-zinc-400",
      bgColor: "bg-zinc-800",
      description: "Run a command in Claude Code:",
      commands: getCommands(),
    };
  };

  const status = getStatus();

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgColor} hover:opacity-90 transition-opacity`}
      >
        <span className={status.color}>{status.icon}</span>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        <ChevronDown className={`w-3 h-3 ${status.color} transition-transform ${showPopover ? "rotate-180" : ""}`} />
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className={status.color}>{status.icon}</span>
                <span className={`font-medium ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-sm text-zinc-300">{status.description}</p>
              {"commands" in status && status.commands && (
                <div className="space-y-2">
                  {status.commands.map((cmd) => (
                    <div key={cmd.command} className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/50">
                        <span className="text-orange-400">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200">{cmd.label}</div>
                          <div className="text-xs text-zinc-500">{cmd.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2">
                          {cmd.command}
                        </code>
                        <CopyButton text={cmd.command} className="mr-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {status.action && (
                <p className="text-xs text-zinc-500">{status.action}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

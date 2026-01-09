import { useState } from "react";
import { Loader2, AlertCircle, ChevronDown, Terminal } from "lucide-react";
import { CopyButton } from "./copy-button";
import { useSkillCommand } from "~/hooks/use-skill-command";
import type { Task, Project } from "~/types";

interface ClaudeStatusProps {
  project: Project | null;
  tasks: Task[];
}

export function ClaudeStatus(props: ClaudeStatusProps) {
  const { project, tasks } = props;

  const [showPopover, setShowPopover] = useState(false);
  const skillCommand = useSkillCommand();

  if (!project) {
    return null;
  }

  const inProgressTask = tasks.find((t) => t.status === "in_progress");

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
      description: "Run this command in Claude Code to start working:",
      command: `${skillCommand} ${project.id}`,
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
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className={status.color}>{status.icon}</span>
                <span className={`font-medium ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-sm text-zinc-300">{status.description}</p>
              {status.command && (
                <div className="flex items-center gap-2 bg-zinc-800 rounded border border-zinc-700">
                  <code className="flex-1 text-sm font-mono text-orange-400 px-3 py-2">
                    {status.command}
                  </code>
                  <CopyButton text={status.command} className="mr-2" />
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

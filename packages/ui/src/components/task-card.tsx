import { useState, useRef, useEffect, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Clock, Lock, Loader2, MoreVertical, RotateCcw, XCircle, Zap } from "lucide-react";
import { useAddComment, useForceResetTask } from "~/queries/tasks";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import { ConfirmDialog } from "./confirm-dialog";
import { Tooltip } from "./tooltip";
import type { Task } from "~/types";

function formatDuration(
  startedAt: string | null,
  completedAt: string | null,
): string | null {
  if (!startedAt || !completedAt) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMs = end - start;

  if (durationMs < 0) {
    return null;
  }

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard(props: TaskCardProps) {
  const { task, onClick } = props;

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showForceResetConfirm, setShowForceResetConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isLocked = task.status === "in_progress";
  const isDone = task.status === "done";
  const duration = isDone
    ? formatDuration(task.started_at, task.completed_at)
    : null;
  const addComment = useAddComment(task.id);
  const forceReset = useForceResetTask();

  useEffect(() => {
    if (!showMenu) {
      return;
    }

    function handleClickOutside(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      if (clickedOutsideMenu && clickedOutsideButton) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
    setShowMenu(!showMenu);
  };

  const handleResetClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowResetConfirm(true);
  };

  const handleCancelClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowCancelConfirm(true);
  };

  const handleForceResetClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowForceResetConfirm(true);
  };

  const handleConfirmReset = () => {
    addComment.mutate(
      "[ACTION:RESET] Please reset all changes and start this task fresh.",
      {
        onSuccess: () => setShowResetConfirm(false),
      },
    );
  };

  const handleConfirmCancel = () => {
    addComment.mutate(
      "[ACTION:CANCEL] Please stop working on this task and move it to backlog.",
      {
        onSuccess: () => setShowCancelConfirm(false),
      },
    );
  };

  const handleConfirmForceReset = () => {
    forceReset.mutate(
      { taskId: task.id, status: "backlog" },
      {
        onSuccess: () => setShowForceResetConfirm(false),
      },
    );
  };

  return (
    <>
      <div
        onClick={onClick}
        className={`
          p-3 rounded-lg border select-none cursor-pointer
          ${isLocked && !task.blocked ? "in-progress-glow" : ""}
          ${task.blocked ? "blocked-glow" : ""}
          ${
            task.blocked
              ? "bg-red-900/20 border-red-500/50 hover:border-red-500"
              : isLocked
                ? "bg-zinc-900 border-orange-500/30"
                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
          }
        `}
      >
        <div className="flex items-start gap-2">
          {task.blocked && (
            <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {isLocked && !task.blocked && (
            <Lock className="shrink-0 w-3 h-3 mt-1 text-orange-500" />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm text-zinc-200 font-medium truncate">
              {task.title}
            </h4>
            {task.current_activity && (
              <p className="mt-1 text-xs text-zinc-500 truncate">
                {task.current_activity}
              </p>
            )}
          </div>
        </div>
        {task.description && !isLocked && !duration && (
          <Tooltip
            content={
              <div className="whitespace-pre-wrap max-h-48 overflow-y-auto">
                {task.description}
              </div>
            }
            maxWidth={350}
          >
            <div className="mt-2 flex items-center gap-1 text-zinc-600">
              <span className="text-xs line-clamp-2">{task.description}</span>
            </div>
          </Tooltip>
        )}
        {duration && (
          <div className="mt-2 flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{duration}</span>
          </div>
        )}
        {isLocked && task.pending_action && (
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {task.pending_action === "cancel" ? "Aborting..." : "Restarting..."}
            </div>
          </div>
        )}
        {isLocked && !task.pending_action && (
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800">
            {task.started_at && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{formatRelativeTime(task.started_at)}</span>
              </div>
            )}
            <button
              ref={buttonRef}
              onClick={handleMenuClick}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors ml-auto"
              title="Task actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {showMenu &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-44 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-[9999] py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              transform: "translateX(-100%)",
            }}
          >
            <button
              onClick={handleResetClick}
              disabled={addComment.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors text-left"
            >
              <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
              Start Over
            </button>
            <button
              onClick={handleCancelClick}
              disabled={addComment.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors text-left"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              Abort Task
            </button>
            <div className="my-1 border-t border-zinc-700" />
            <button
              onClick={handleForceResetClick}
              disabled={forceReset.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors text-left"
            >
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              Force Reset
            </button>
          </div>,
          document.body
        )}

      {showResetConfirm && (
        <ConfirmDialog
          title="Start Over?"
          message={
            <div className="space-y-2">
              <p>This will ask Claude to:</p>
              <ul className="list-disc list-inside text-zinc-500">
                <li>Discard all uncommitted code changes</li>
                <li>Start the task fresh from the beginning</li>
              </ul>
            </div>
          }
          confirmLabel="Start Over"
          cancelLabel="Go Back"
          confirmVariant="warning"
          isLoading={addComment.isPending}
          onConfirm={handleConfirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          title="Abort Task?"
          message={
            <div className="space-y-2">
              <p>This will ask Claude to:</p>
              <ul className="list-disc list-inside text-zinc-500">
                <li>Stop working on this task</li>
                <li>Discard all uncommitted code changes</li>
                <li>Move the task to Backlog</li>
              </ul>
            </div>
          }
          confirmLabel="Abort Task"
          cancelLabel="Keep Working"
          isLoading={addComment.isPending}
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {showForceResetConfirm && (
        <ConfirmDialog
          title="Force Reset Task?"
          message={
            <div className="space-y-2">
              <p>Use this when Claude has stopped responding. This will immediately:</p>
              <ul className="list-disc list-inside text-zinc-500">
                <li>Move the task back to Backlog</li>
                <li>Clear the in-progress state</li>
              </ul>
              <p className="text-yellow-500 text-sm mt-2">
                Note: This will NOT reset any code changes. You may need to manually run git reset if needed.
              </p>
            </div>
          }
          confirmLabel="Force Reset"
          cancelLabel="Cancel"
          confirmVariant="warning"
          isLoading={forceReset.isPending}
          onConfirm={handleConfirmForceReset}
          onCancel={() => setShowForceResetConfirm(false)}
        />
      )}
    </>
  );
}

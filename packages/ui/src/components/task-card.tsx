import { useState, useRef } from "react";
import { Clock, Lock, RotateCcw, XCircle } from "lucide-react";
import { useAddComment } from "~/queries/tasks";
import { useDragContext } from "~/hooks/use-drag-and-drop";
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
  onClick: () => void;
}

export function TaskCard(props: TaskCardProps) {
  const { task, onClick } = props;

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { dragItem, dropTarget, setDragItem, setDropTarget } = useDragContext();

  const isLocked = task.status === "in_progress";
  const isDone = task.status === "done";
  const duration = isDone
    ? formatDuration(task.started_at, task.completed_at)
    : null;
  const addComment = useAddComment(task.id);

  const isDragging = dragItem?.type === "task" && dragItem.task.id === task.id;
  const isDropTargetBefore =
    dropTarget?.type === "task" &&
    dropTarget.taskId === task.id &&
    dropTarget.position === "before";
  const isDropTargetAfter =
    dropTarget?.type === "task" &&
    dropTarget.taskId === task.id &&
    dropTarget.position === "after";

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "task", taskId: task.id }));

    requestAnimationFrame(() => {
      setDragItem({ type: "task", task });
    });
  };

  const handleDragEnd = () => {
    setDragItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragItem || dragItem.type !== "task") {
      return;
    }

    if (dragItem.task.id === task.id) {
      return;
    }

    if (dragItem.task.status === "in_progress") {
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";

    setDropTarget({ type: "task", taskId: task.id, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    if (dropTarget?.type === "task" && dropTarget.taskId === task.id) {
      setDropTarget(null);
    }
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowResetConfirm(true);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCancelConfirm(true);
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

  return (
    <div className="relative">
      {isDropTargetBefore && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
      )}
      <div
        ref={cardRef}
        draggable={!isLocked}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={onClick}
        className={`
          p-3 rounded-lg border select-none
          ${isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
          ${isDragging ? "opacity-50" : ""}
          ${isLocked && !task.blocked ? "in-progress-glow" : ""}
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
            <div className="mt-2 flex items-center gap-1 text-zinc-600 cursor-help">
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
        {isLocked && (
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-800">
            <button
              onClick={handleResetClick}
              disabled={addComment.isPending}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
              title="Discard changes and start this task from scratch"
            >
              <RotateCcw className="w-3 h-3" />
              Start Over
            </button>
            <button
              onClick={handleCancelClick}
              disabled={addComment.isPending}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
              title="Stop work, discard changes, and return task to Ready"
            >
              <XCircle className="w-3 h-3" />
              Abort Task
            </button>
          </div>
        )}
      </div>
      {isDropTargetAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
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
    </div>
  );
}

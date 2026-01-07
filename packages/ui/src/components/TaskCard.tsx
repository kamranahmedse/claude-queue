import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, RotateCcw, XCircle, Lock } from "lucide-react";
import { useAddComment } from "~/queries/tasks";
import type { Task } from "~/types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard(props: TaskCardProps) {
  const { task, onClick } = props;

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isLocked = task.status === "in_progress";
  const addComment = useAddComment(task.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: task.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
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
    addComment.mutate("[ACTION:RESET] Please reset all changes and start this task fresh.", {
      onSuccess: () => setShowResetConfirm(false),
    });
  };

  const handleConfirmCancel = () => {
    addComment.mutate("[ACTION:CANCEL] Please stop working on this task and move it back to ready.", {
      onSuccess: () => setShowCancelConfirm(false),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isLocked ? {} : listeners)}
      onClick={onClick}
      className={`
        p-3 rounded-lg border transition-colors
        ${isLocked ? "cursor-default" : "cursor-pointer"}
        ${isDragging ? "opacity-50" : ""}
        ${
          task.blocked
            ? "bg-red-900/20 border-red-500/50 hover:border-red-500"
            : isLocked
            ? "bg-orange-900/10 border-orange-500/30"
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
      {task.description && !isLocked && (
        <div className="mt-2 flex items-center gap-1 text-zinc-600">
          <MessageSquare className="w-3 h-3" />
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

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowResetConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-lg font-medium text-zinc-100 mb-3">
              Start Over?
            </h3>
            <div className="text-sm text-zinc-400 space-y-2 mb-5">
              <p>This will ask Claude to:</p>
              <ul className="list-disc list-inside text-zinc-500">
                <li>Discard all uncommitted code changes</li>
                <li>Start the task fresh from the beginning</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={addComment.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors"
              >
                {addComment.isPending ? "Restarting..." : "Start Over"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCancelConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-lg font-medium text-zinc-100 mb-3">
              Abort Task?
            </h3>
            <div className="text-sm text-zinc-400 space-y-2 mb-5">
              <p>This will ask Claude to:</p>
              <ul className="list-disc list-inside text-zinc-500">
                <li>Stop working on this task</li>
                <li>Discard all uncommitted code changes</li>
                <li>Move the task back to Ready</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Keep Working
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={addComment.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                {addComment.isPending ? "Aborting..." : "Abort Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

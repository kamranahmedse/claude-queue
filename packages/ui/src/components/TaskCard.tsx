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

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    addComment.mutate("[ACTION:RESET] Please reset all changes and start this task fresh.");
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    addComment.mutate("[ACTION:CANCEL] Please stop working on this task and move it back to ready.");
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
            onClick={handleReset}
            disabled={addComment.isPending}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors"
            title="Reset all changes and start fresh"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleCancel}
            disabled={addComment.isPending}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
            title="Stop work and move back to ready"
          >
            <XCircle className="w-3 h-3" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare } from "lucide-react";
import type { Task } from "~/types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard(props: TaskCardProps) {
  const { task, onClick } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        p-3 rounded-lg border cursor-pointer transition-colors
        ${isDragging ? "opacity-50" : ""}
        ${
          task.blocked
            ? "bg-red-900/20 border-red-500/50 hover:border-red-500"
            : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
        }
      `}
    >
      <div className="flex items-start gap-2">
        {task.blocked && (
          <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-red-500 animate-pulse" />
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
      {task.description && (
        <div className="mt-2 flex items-center gap-1 text-zinc-600">
          <MessageSquare className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

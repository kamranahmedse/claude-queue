import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "~/types";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddClick?: () => void;
}

export function Column(props: ColumnProps) {
  const { id, title, tasks, onTaskClick, onAddClick } = props;

  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        <span className="text-xs text-zinc-600">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`
          min-h-[200px] p-2 rounded-lg border border-dashed transition-colors
          ${isOver ? "border-zinc-600 bg-zinc-900/50" : "border-zinc-800/50"}
        `}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </div>
        </SortableContext>
        {(id === "backlog" || id === "ready") && onAddClick && (
          <button
            onClick={onAddClick}
            className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
}

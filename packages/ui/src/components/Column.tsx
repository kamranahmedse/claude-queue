import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import type { Task, TaskStatus } from "~/types";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddClick?: () => void;
  onDeleteAll?: () => void;
  isDeleting?: boolean;
}

export function Column(props: ColumnProps) {
  const { id, title, tasks, onTaskClick, onAddClick, onDeleteAll, isDeleting } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });

  const handleDeleteAll = () => {
    if (onDeleteAll) {
      onDeleteAll();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex-1 min-w-[280px] max-w-[320px] select-none">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && onDeleteAll && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Clear all tasks"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-xs text-zinc-600">{tasks.length}</span>
          </div>
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

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-lg font-medium text-zinc-100 mb-2">
              Clear all {title.toLowerCase()} tasks?
            </h3>
            <p className="text-sm text-zinc-400 mb-5">
              This will delete {tasks.length} task{tasks.length !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

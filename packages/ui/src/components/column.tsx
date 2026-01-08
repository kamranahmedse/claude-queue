import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import type { Task, TaskStatus } from "~/types";
import { TaskCard } from "./task-card";
import { ConfirmDialog } from "./confirm-dialog";

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddClick?: () => void;
  onDeleteAll?: () => void;
  isDeleting?: boolean;
  showDropNotAllowed?: boolean;
}

export function Column(props: ColumnProps) {
  const { id, title, tasks, onTaskClick, onAddClick, onDeleteAll, isDeleting, showDropNotAllowed } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });

  const lastActivity = useMemo(() => {
    if (tasks.length === 0) {
      return null;
    }

    let mostRecent = tasks[0].updated_at;
    for (const task of tasks) {
      if (task.updated_at > mostRecent) {
        mostRecent = task.updated_at;
      }
    }
    return mostRecent;
  }, [tasks]);

  const handleDeleteAll = () => {
    if (onDeleteAll) {
      onDeleteAll();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex-1 min-w-[280px] max-w-[320px] select-none flex flex-col">
        <div className="sticky top-0 z-10 bg-zinc-950 py-3 px-1">
          <div className="flex items-center justify-between">
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
          {lastActivity && (
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Last activity: {formatRelativeTime(lastActivity)}
            </p>
          )}
        </div>
        <div
          ref={setNodeRef}
          className={`
            flex-1 px-1
            ${showDropNotAllowed ? "bg-red-900/20 ring-2 ring-red-500/30 ring-inset rounded-lg" : isOver ? "bg-zinc-900/30" : ""}
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
        <ConfirmDialog
          title={`Clear all ${title.toLowerCase()} tasks?`}
          message={`This will delete ${tasks.length} task${tasks.length !== 1 ? "s" : ""}. This action cannot be undone.`}
          confirmLabel="Delete All"
          isLoading={isDeleting}
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

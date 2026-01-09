import { useState, useMemo, useRef, useEffect } from "react";
import { Trash2, HelpCircle, ChevronLeft, Inbox, CheckCircle2, Clock, CheckCheck, Plus } from "lucide-react";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import type { Task, TaskStatus, Template } from "~/types";
import { TaskCard } from "./task-card";
import { ConfirmDialog } from "./confirm-dialog";

const TASK_DRAG_TYPE = "application/x-task";
const TEMPLATE_DRAG_TYPE = "application/x-template";

const COLUMN_ICONS: Record<TaskStatus, React.ReactNode> = {
  backlog: <Inbox className="w-4 h-4" />,
  ready: <CheckCircle2 className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  done: <CheckCheck className="w-4 h-4" />,
};

const COLUMN_HELP: Record<TaskStatus, { title: string; description: string }> = {
  backlog: {
    title: "Backlog",
    description: "Tasks waiting to be prioritized. Move them to Ready when you want Claude to work on them.",
  },
  ready: {
    title: "Ready",
    description: "Tasks ready for Claude to pick up. Claude will claim tasks from here in order.",
  },
  in_progress: {
    title: "In Progress",
    description: "Tasks Claude is actively working on. You can add comments or abort if needed.",
  },
  done: {
    title: "Done",
    description: "Completed tasks. Claude commits changes before moving tasks here.",
  },
};

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDeleteAll?: () => void;
  isDeleting?: boolean;
  showBorder?: boolean;
  onMoveTask: (taskId: string, toStatus: TaskStatus, toPosition: number) => void;
  onTemplateDropOnColumn?: (template: Template, status: TaskStatus) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  justDroppedTaskId?: string | null;
  onAddTask?: () => void;
}

const COLLAPSED_KEY_PREFIX = "claude-board-column-collapsed-";

export function Column(props: ColumnProps) {
  const {
    id,
    title,
    tasks,
    onTaskClick,
    onDeleteAll,
    isDeleting,
    showBorder,
    onMoveTask,
    onTemplateDropOnColumn,
    isDragging,
    onDragStart,
    onDragEnd,
    justDroppedTaskId,
    onAddTask,
  } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(`${COLLAPSED_KEY_PREFIX}${id}`) === "true";
  });
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const isInProgressColumn = id === "in_progress";

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(`${COLLAPSED_KEY_PREFIX}${id}`, String(newValue));
  };

  useEffect(() => {
    if (!showHelp) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHelp]);

  const help = COLUMN_HELP[id];

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

  const handleDragOver = (e: React.DragEvent) => {
    const isTaskDrag = e.dataTransfer.types.includes(TASK_DRAG_TYPE);
    const isTemplateDrag = e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE);

    if (!isTaskDrag && !isTemplateDrag) {
      return;
    }

    if (isInProgressColumn) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    if (isTemplateDrag && id !== "backlog" && id !== "ready") {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (isTaskDrag && dropIndex === null) {
      setDropIndex(tasks.length);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDropIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropIndex(null);
    setDraggedTaskId(null);

    if (isInProgressColumn) {
      return;
    }

    const templateData = e.dataTransfer.getData(TEMPLATE_DRAG_TYPE);
    if (templateData && onTemplateDropOnColumn && (id === "backlog" || id === "ready")) {
      const { template } = JSON.parse(templateData);
      onTemplateDropOnColumn(template, id);
      return;
    }

    const taskData = e.dataTransfer.getData(TASK_DRAG_TYPE);
    if (!taskData) {
      return;
    }

    const { taskId } = JSON.parse(taskData);

    let targetPosition: number;
    if (tasks.length === 0) {
      targetPosition = 0;
    } else if (dropIndex === null || dropIndex >= tasks.length) {
      targetPosition = tasks[tasks.length - 1].position + 1;
    } else {
      targetPosition = tasks[dropIndex].position;
    }

    onMoveTask(taskId, id, targetPosition);
  };

  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(TASK_DRAG_TYPE, JSON.stringify({ taskId: task.id }));
    setDraggedTaskId(task.id);
    onDragStart();
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDropIndex(null);
    onDragEnd();
  };

  const handleTopDropZoneDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) {
      return;
    }

    if (isInProgressColumn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (dropIndex !== 0) {
      setDropIndex(0);
    }
  };

  const handleBottomDropZoneDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) {
      return;
    }

    if (isInProgressColumn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const newDropIndex = tasks.length;
    if (dropIndex !== newDropIndex) {
      setDropIndex(newDropIndex);
    }
  };

  const handleTaskDragOver = (e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) {
      return;
    }

    if (isInProgressColumn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = (rect.top + rect.bottom) / 2;
    const newDropIndex = e.clientY <= midpoint ? index : index + 1;

    if (newDropIndex !== dropIndex) {
      setDropIndex(newDropIndex);
    }
  };

  if (isCollapsed) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          shrink-0 flex flex-col items-center px-2 py-3 select-none cursor-pointer
          hover:bg-zinc-800/50 transition-colors
          ${showBorder ? "border-r border-zinc-800" : ""}
        `}
        onClick={handleToggleCollapse}
        title={`Expand ${title}`}
      >
        <span className="text-zinc-500">{COLUMN_ICONS[id]}</span>
        <span className="text-xs text-zinc-500 font-medium writing-mode-vertical whitespace-nowrap mt-2">
          {title}
        </span>
        <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded mt-2">
          {tasks.length}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`w-[300px] shrink-0 select-none flex flex-col pl-3 ${showBorder ? "border-r border-zinc-800 pr-3" : ""}`}>
        <div className={`sticky top-0 bg-zinc-950 py-3 px-1 ${showHelp ? "z-20" : "z-10"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleCollapse}
                className="p-1 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                title={`Collapse ${title}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
              <div className="relative" ref={helpRef}>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-1 text-zinc-600 hover:text-zinc-400 rounded transition-colors"
                >
                  <HelpCircle className="w-3 h-3" />
                </button>
                {showHelp && (
                  <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      <strong className="text-zinc-200">{help.title}</strong>
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                      {help.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {tasks.length > 0 && onDeleteAll && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                title="Clear all tasks"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {lastActivity && (
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Last activity: {formatRelativeTime(lastActivity)}
            </p>
          )}
        </div>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 px-1 pb-4 rounded-lg min-h-[100px]"
        >
          <div className="space-y-2">
            <div
              onDragOver={handleTopDropZoneDragOver}
              className="h-1 -mb-1 relative"
            >
              {dropIndex === 0 && isDragging && tasks.length > 0 && (!draggedTaskId || tasks[0].id !== draggedTaskId) && (
                <div className="absolute top-full left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
              )}
            </div>
            {tasks.map((task, index) => {
              const isBeingDragged = task.id === draggedTaskId;
              const isJustDropped = task.id === justDroppedTaskId;
              const showIndicatorBefore = dropIndex === index && index > 0 && (!draggedTaskId || draggedTaskId !== task.id);

              return (
                <div
                  key={task.id}
                  onDragOver={(e) => handleTaskDragOver(e, index)}
                  className="relative"
                >
                  {showIndicatorBefore && (
                    <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                  <div
                    draggable={task.status !== "in_progress"}
                    onDragStart={(e) => handleTaskDragStart(e, task)}
                    onDragEnd={handleTaskDragEnd}
                    className={`${isBeingDragged ? "opacity-50" : ""} ${isJustDropped ? "just-dropped rounded-lg" : ""}`}
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick(task)}
                    />
                  </div>
                </div>
              );
            })}
            <div className="relative">
              {dropIndex !== null && dropIndex >= tasks.length && isDragging && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />
              )}
              {onAddTask && (
                <button
                  onClick={onAddTask}
                  onDragOver={handleBottomDropZoneDragOver}
                  className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add task
                </button>
              )}
            </div>
          </div>
          <div
            onDragOver={handleBottomDropZoneDragOver}
            className="flex-1 min-h-[20px]"
          />
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

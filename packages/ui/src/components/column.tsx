import { useState, useMemo, useRef, useEffect } from "react";
import { Trash2, HelpCircle, ChevronLeft, Inbox, CheckCircle2, Clock, CheckCheck } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import type { Task, TaskStatus } from "~/types";
import { TaskCard } from "./task-card";
import { ConfirmDialog } from "./confirm-dialog";

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
}

const COLLAPSED_KEY_PREFIX = "claude-board-column-collapsed-";

export function Column(props: ColumnProps) {
  const { id, title, tasks, onTaskClick, onDeleteAll, isDeleting, showBorder } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(`${COLLAPSED_KEY_PREFIX}${id}`) === "true";
  });
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

  if (isCollapsed) {
    return (
      <Droppable droppableId={id} type="TASK" isDropDisabled={isInProgressColumn}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              shrink-0 flex flex-col items-center px-2 py-3 select-none cursor-pointer
              hover:bg-zinc-800/50 transition-colors
              ${showBorder ? "border-r border-zinc-800" : ""}
              ${snapshot.isDraggingOver && !isInProgressColumn ? "bg-zinc-900/30" : ""}
              ${snapshot.isDraggingOver && isInProgressColumn ? "bg-red-900/20" : ""}
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
            <div className="hidden">{provided.placeholder}</div>
          </div>
        )}
      </Droppable>
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
        <Droppable droppableId={id} type="TASK" isDropDisabled={isInProgressColumn}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                flex-1 px-1 pb-4 rounded-lg transition-colors min-h-[100px]
                ${snapshot.isDraggingOver && isInProgressColumn ? "bg-red-900/20 ring-2 ring-red-500/30 ring-inset" : ""}
                ${snapshot.isDraggingOver && !isInProgressColumn ? "bg-blue-900/10 ring-2 ring-blue-500/30 ring-inset" : ""}
              `}
            >
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                    isDragDisabled={task.status === "in_progress"}
                  >
                    {(dragProvided, dragSnapshot) => {
                      const style = {
                        ...dragProvided.draggableProps.style,
                        transition: dragSnapshot.isDropAnimating ? "transform 0.001s" : dragProvided.draggableProps.style?.transition,
                      };
                      return (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={style}
                        >
                          <TaskCard
                            task={task}
                            onClick={() => onTaskClick(task)}
                            isDragging={dragSnapshot.isDragging}
                          />
                        </div>
                      );
                    }}
                  </Draggable>
                ))}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
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

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { listTasksOptions, useCreateTask, useMoveTask, useDeleteAllTasks, useTasksRefetchInterval } from "~/queries/tasks";
import { listTemplatesOptions, useCreateTemplate, useMoveTemplate, useUpdateTemplate } from "~/queries/templates";
import type { Task, TaskStatus, Template } from "~/types";
import { COLUMNS } from "~/types";
import { Column } from "./Column";
import { TemplateColumn } from "./TemplateColumn";
import { TaskCard } from "./TaskCard";
import { TemplateCard } from "./TemplateCard";
import { TaskDetail } from "./TaskDetail";
import { AddTaskModal } from "./AddTaskModal";
import { AddTemplateModal } from "./AddTemplateModal";
import { EditTemplateModal } from "./EditTemplateModal";

interface BoardProps {
  projectId: string;
}

const COLUMN_IDS = new Set(["templates", "backlog", "ready", "in_progress", "done"]);

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    const taskCollisions = pointerCollisions.filter(
      (collision) => !COLUMN_IDS.has(collision.id as string)
    );
    if (taskCollisions.length > 0) {
      return taskCollisions;
    }
    return pointerCollisions;
  }

  return rectIntersection(args);
};

function reorderTasks(tasks: Task[], taskId: string, targetStatus: TaskStatus, targetPosition: number): Task[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return tasks;
  }

  const oldStatus = task.status;
  const oldPosition = task.position;

  return tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, status: targetStatus, position: targetPosition };
    }

    if (t.status === oldStatus && t.id !== taskId) {
      if (t.position > oldPosition) {
        return { ...t, position: t.position - 1 };
      }
    }

    if (t.status === targetStatus && t.id !== taskId) {
      if (t.position >= targetPosition) {
        return { ...t, position: t.position + 1 };
      }
    }

    return t;
  });
}

function reorderTemplates(templates: Template[], templateId: string, targetPosition: number): Template[] {
  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return templates;
  }

  const oldPosition = template.position;

  return templates.map((t) => {
    if (t.id === templateId) {
      return { ...t, position: targetPosition };
    }

    if (targetPosition > oldPosition) {
      if (t.position > oldPosition && t.position <= targetPosition) {
        return { ...t, position: t.position - 1 };
      }
    } else if (targetPosition < oldPosition) {
      if (t.position >= targetPosition && t.position < oldPosition) {
        return { ...t, position: t.position + 1 };
      }
    }

    return t;
  });
}

export function Board(props: BoardProps) {
  const { projectId } = props;

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus | null>(null);
  const [addTaskFromTemplate, setAddTaskFromTemplate] = useState<Template | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);
  const [optimisticTemplates, setOptimisticTemplates] = useState<Template[] | null>(null);
  const [overInfo, setOverInfo] = useState<{ status: TaskStatus; position: number } | null>(null);
  const [templateOverInfo, setTemplateOverInfo] = useState<{ position: number } | null>(null);
  const [templateDropTarget, setTemplateDropTarget] = useState<TaskStatus | null>(null);

  const refetchInterval = useTasksRefetchInterval();
  const { data: serverTasks = [], isLoading } = useQuery({
    ...listTasksOptions(projectId),
    refetchInterval,
  });
  const { data: serverTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    ...listTemplatesOptions(projectId),
    refetchInterval: 5000,
  });
  const createTask = useCreateTask(projectId);
  const moveTask = useMoveTask();
  const deleteAllTasks = useDeleteAllTasks(projectId);
  const createTemplate = useCreateTemplate(projectId);
  const updateTemplate = useUpdateTemplate();
  const moveTemplate = useMoveTemplate();

  const tasks = optimisticTasks ?? serverTasks;
  const templates = optimisticTemplates ?? serverTemplates;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      ready: [],
      in_progress: [],
      done: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort((a, b) => a.position - b.position);
    }

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
      return;
    }

    const template = templates.find((t) => t.id === event.active.id);
    if (template) {
      setActiveTemplate(template);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const draggedTemplate = serverTemplates.find((t) => t.id === active.id);
    if (draggedTemplate) {
      const overTemplate = serverTemplates.find((t) => t.id === over.id);
      if (overTemplate) {
        const overIndex = serverTemplates.findIndex((t) => t.id === over.id);
        setTemplateOverInfo({ position: overIndex });
        setTemplateDropTarget(null);

        if (draggedTemplate.position !== overIndex) {
          const newTemplates = reorderTemplates(serverTemplates, draggedTemplate.id, overIndex);
          setOptimisticTemplates(newTemplates);
        }
      } else {
        const targetStatus = over.id as string;
        if (targetStatus === "backlog" || targetStatus === "ready") {
          setTemplateDropTarget(targetStatus);
          setTemplateOverInfo(null);
          setOptimisticTemplates(null);
        } else {
          setTemplateDropTarget(null);
          setTemplateOverInfo(null);
          setOptimisticTemplates(null);
        }
      }
      return;
    }

    const draggedTask = serverTasks.find((t) => t.id === active.id);
    if (!draggedTask) {
      return;
    }

    let targetStatus: TaskStatus;
    let targetPosition: number;

    const overTask = serverTasks.find((t) => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
      const statusTasks = tasksByStatus[targetStatus];
      const overIndex = statusTasks.findIndex((t) => t.id === over.id);
      targetPosition = overIndex;
    } else {
      targetStatus = over.id as TaskStatus;
      targetPosition = tasksByStatus[targetStatus].length;
    }

    if (targetStatus === "in_progress") {
      return;
    }

    setOverInfo({ status: targetStatus, position: targetPosition });

    if (draggedTask.status !== targetStatus || draggedTask.position !== targetPosition) {
      const newTasks = reorderTasks(serverTasks, draggedTask.id, targetStatus, targetPosition);
      setOptimisticTasks(newTasks);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active } = event;

    const draggedTemplate = serverTemplates.find((t) => t.id === active.id);
    if (draggedTemplate) {
      if (templateDropTarget) {
        setActiveTemplate(null);
        setTemplateOverInfo(null);
        setOptimisticTemplates(null);
        setAddTaskStatus(templateDropTarget);
        setAddTaskFromTemplate(draggedTemplate);
        setTemplateDropTarget(null);
        return;
      }

      if (!templateOverInfo) {
        setActiveTemplate(null);
        setOptimisticTemplates(null);
        setTemplateDropTarget(null);
        return;
      }

      const { position: targetPosition } = templateOverInfo;

      if (draggedTemplate.position === targetPosition) {
        setActiveTemplate(null);
        setTemplateOverInfo(null);
        setOptimisticTemplates(null);
        setTemplateDropTarget(null);
        return;
      }

      setActiveTemplate(null);
      setTemplateOverInfo(null);
      setTemplateDropTarget(null);

      moveTemplate.mutate(
        {
          templateId: draggedTemplate.id,
          position: targetPosition,
        },
        {
          onSettled: () => {
            setOptimisticTemplates(null);
          },
        }
      );
      return;
    }

    if (!overInfo) {
      setActiveTask(null);
      setOptimisticTasks(null);
      return;
    }

    const draggedTask = serverTasks.find((t) => t.id === active.id);
    if (!draggedTask) {
      setActiveTask(null);
      setOverInfo(null);
      setOptimisticTasks(null);
      return;
    }

    const { status: targetStatus, position: targetPosition } = overInfo;

    if (targetStatus === "in_progress") {
      setActiveTask(null);
      setOverInfo(null);
      setOptimisticTasks(null);
      return;
    }

    if (draggedTask.status === targetStatus && draggedTask.position === targetPosition) {
      setActiveTask(null);
      setOverInfo(null);
      setOptimisticTasks(null);
      return;
    }

    setActiveTask(null);
    setOverInfo(null);

    moveTask.mutate(
      {
        taskId: draggedTask.id,
        status: targetStatus,
        position: targetPosition,
      },
      {
        onSettled: () => {
          setOptimisticTasks(null);
        },
      }
    );
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveTemplate(null);
    setOverInfo(null);
    setTemplateOverInfo(null);
    setTemplateDropTarget(null);
    setOptimisticTasks(null);
    setOptimisticTemplates(null);
  };

  const handleAddTask = (title: string, description: string) => {
    if (!addTaskStatus) {
      return;
    }
    createTask.mutate(
      { title, description: description || undefined, status: addTaskStatus },
      {
        onSuccess: () => {
          setAddTaskStatus(null);
          setAddTaskFromTemplate(null);
        },
      }
    );
  };

  const handleCloseAddTask = () => {
    setAddTaskStatus(null);
    setAddTaskFromTemplate(null);
  };

  const handleAddTemplate = (title: string, description: string) => {
    createTemplate.mutate(
      { title, description: description || undefined },
      {
        onSuccess: () => setShowAddTemplate(false),
      }
    );
  };

  const handleUpdateTemplate = (title: string, description: string) => {
    if (!editingTemplate) {
      return;
    }
    updateTemplate.mutate(
      { templateId: editingTemplate.id, title, description: description || undefined },
      {
        onSuccess: () => setEditingTemplate(null),
      }
    );
  };

  const showLoading = isLoading || isLoadingTemplates;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
          <div className="text-sm text-zinc-500">Loading...</div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 flex pt-0 pb-4 px-4 overflow-x-auto">
          <TemplateColumn
            templates={templates}
            onTemplateClick={setEditingTemplate}
            onAddClick={() => setShowAddTemplate(true)}
          />
          <div className="w-px bg-zinc-800 mx-3 self-stretch" />
          {COLUMNS.map((column, index) => (
            <div key={column.id} className="flex">
              <Column
                id={column.id}
                title={column.title}
                tasks={tasksByStatus[column.id]}
                onTaskClick={setSelectedTask}
                onAddClick={
                  column.id === "backlog" || column.id === "ready"
                    ? () => setAddTaskStatus(column.id)
                    : undefined
                }
                onDeleteAll={
                  column.id !== "in_progress"
                    ? () => deleteAllTasks.mutate(column.id)
                    : undefined
                }
                isDeleting={deleteAllTasks.isPending}
              />
              {index < COLUMNS.length - 1 && (
                <div className="w-px bg-zinc-800 mx-3 self-stretch" />
              )}
            </div>
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="rotate-3 opacity-90">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
          {activeTemplate && (
            <div className="rotate-3 opacity-90">
              <TemplateCard template={activeTemplate} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {addTaskStatus && (
        <AddTaskModal
          status={addTaskStatus}
          initialTemplate={addTaskFromTemplate}
          onClose={handleCloseAddTask}
          onSubmit={handleAddTask}
          isLoading={createTask.isPending}
        />
      )}

      {showAddTemplate && (
        <AddTemplateModal
          onClose={() => setShowAddTemplate(false)}
          onSubmit={handleAddTemplate}
          isLoading={createTemplate.isPending}
        />
      )}

      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSubmit={handleUpdateTemplate}
          isLoading={updateTemplate.isPending}
        />
      )}
    </div>
  );
}

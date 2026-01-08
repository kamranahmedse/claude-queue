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
import { listTasksOptions, useCreateTask, useMoveTask, useTasksRefetchInterval } from "~/queries/tasks";
import type { Task, TaskStatus } from "~/types";
import { COLUMNS } from "~/types";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { TaskDetail } from "./TaskDetail";
import { AddTaskModal } from "./AddTaskModal";

interface BoardProps {
  projectId: string;
}

const COLUMN_IDS = new Set(["backlog", "ready", "in_progress", "done"]);

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

export function Board(props: BoardProps) {
  const { projectId } = props;

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);
  const [overInfo, setOverInfo] = useState<{ status: TaskStatus; position: number } | null>(null);

  const refetchInterval = useTasksRefetchInterval();
  const { data: serverTasks = [], isLoading } = useQuery({
    ...listTasksOptions(projectId),
    refetchInterval,
  });
  const createTask = useCreateTask(projectId);
  const moveTask = useMoveTask();

  const tasks = optimisticTasks ?? serverTasks;

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
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
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
    setOverInfo(null);
    setOptimisticTasks(null);
  };

  const handleAddTask = (title: string, description: string) => {
    if (!addTaskStatus) {
      return;
    }
    createTask.mutate(
      { title, description: description || undefined, status: addTaskStatus },
      {
        onSuccess: () => setAddTaskStatus(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-zinc-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 p-4 overflow-x-auto">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              onTaskClick={setSelectedTask}
              onAddClick={
                column.id === "backlog" || column.id === "ready"
                  ? () => setAddTaskStatus(column.id)
                  : undefined
              }
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="rotate-3 opacity-90">
              <TaskCard task={activeTask} onClick={() => {}} />
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
          onClose={() => setAddTaskStatus(null)}
          onSubmit={handleAddTask}
          isLoading={createTask.isPending}
        />
      )}
    </>
  );
}

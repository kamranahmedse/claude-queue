import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { listTasksOptions, useCreateTask, useMoveTask } from "~/queries/tasks";
import type { Task, TaskStatus } from "~/types";
import { COLUMNS } from "~/types";
import { Column } from "./Column";
import { TaskCard } from "./TaskCard";
import { TaskDetail } from "./TaskDetail";
import { AddTaskModal } from "./AddTaskModal";

interface BoardProps {
  projectId: string;
}

export function Board(props: BoardProps) {
  const { projectId } = props;

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus | null>(null);

  const { data: tasks = [], isLoading } = useQuery(listTasksOptions(projectId));
  const createTask = useCreateTask(projectId);
  const moveTask = useMoveTask();

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      return;
    }

    if (active.id === over.id) {
      return;
    }

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) {
      return;
    }

    let targetStatus: TaskStatus;
    let targetPosition: number;

    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
      const statusTasks = tasksByStatus[targetStatus];
      const overIndex = statusTasks.findIndex((t) => t.id === over.id);
      targetPosition = overIndex;
    } else {
      targetStatus = over.id as TaskStatus;
      targetPosition = tasksByStatus[targetStatus].length;
    }

    if (activeTask.status === targetStatus && activeTask.position === targetPosition) {
      return;
    }

    moveTask.mutate({
      taskId: activeTask.id,
      status: targetStatus,
      position: targetPosition,
    });
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
        <DragOverlay>
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

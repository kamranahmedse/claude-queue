import { useState, useMemo, forwardRef, useImperativeHandle, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasksOptions, useCreateTask, useMoveTask, useDeleteAllTasks, useTasksRefetchInterval } from "~/queries/tasks";
import { listTemplatesOptions, useCreateTemplate, useMoveTemplate, useUpdateTemplate } from "~/queries/templates";
import { httpPost } from "~/lib/http";
import type { Attachment } from "~/types";
import { useTaskNotifications } from "~/hooks/use-task-notifications";
import type { Task, TaskStatus, Template } from "~/types";
import { COLUMNS } from "~/types";
import { Column } from "./column";
import { TemplateColumn } from "./template-column";
import { TaskDetail } from "./task-detail";
import { AddTaskModal } from "./add-task-modal";
import { AddTemplateModal } from "./add-template-modal";
import { EditTemplateModal } from "./edit-template-modal";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const data = await fileToBase64(file);
  return httpPost<Attachment>(`/attachments/task/${taskId}`, {
    filename: file.name,
    data,
    mimeType: file.type,
  });
}

async function uploadTemplateAttachment(templateId: string, file: File): Promise<Attachment> {
  const data = await fileToBase64(file);
  return httpPost<Attachment>(`/attachments/template/${templateId}`, {
    filename: file.name,
    data,
    mimeType: file.type,
  });
}

interface BoardProps {
  projectId: string;
}

export interface BoardRef {
  openAddTask: () => void;
  openAddTemplate: () => void;
  closeModals: () => void;
}

interface BoardContentProps {
  projectId: string;
  boardRef: React.Ref<BoardRef>;
}

function BoardContent(props: BoardContentProps) {
  const { projectId, boardRef } = props;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [addTaskStatus, setAddTaskStatus] = useState<TaskStatus | null>(null);
  const [addTaskFromTemplate, setAddTaskFromTemplate] = useState<Template | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [justDroppedTaskId, setJustDroppedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!justDroppedTaskId) {
      return;
    }
    const timer = setTimeout(() => setJustDroppedTaskId(null), 600);
    return () => clearTimeout(timer);
  }, [justDroppedTaskId]);

  useImperativeHandle(boardRef, () => ({
    openAddTask: () => setAddTaskStatus("ready"),
    openAddTemplate: () => setShowAddTemplate(true),
    closeModals: () => {
      setSelectedTask(null);
      setEditingTemplate(null);
      setAddTaskStatus(null);
      setAddTaskFromTemplate(null);
      setShowAddTemplate(false);
    },
  }));

  const refetchInterval = useTasksRefetchInterval();
  const { data: tasks = [], isLoading } = useQuery({
    ...listTasksOptions(projectId),
    refetchInterval,
  });
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    ...listTemplatesOptions(projectId),
    refetchInterval: 5000,
  });
  const queryClient = useQueryClient();
  const createTask = useCreateTask(projectId);
  const moveTask = useMoveTask();
  const deleteAllTasks = useDeleteAllTasks(projectId);
  const createTemplate = useCreateTemplate(projectId);
  const updateTemplate = useUpdateTemplate();
  const moveTemplate = useMoveTemplate();

  useTaskNotifications(tasks as Task[]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      ready: [],
      in_progress: [],
      done: [],
    };

    if (!Array.isArray(tasks)) {
      return grouped;
    }

    for (const task of tasks) {
      if (task && task.status && grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort((a, b) => a.position - b.position);
    }

    return grouped;
  }, [tasks]);

  const sortedTemplates = useMemo(() => {
    if (!Array.isArray(templates)) {
      return [];
    }
    return [...templates].sort((a, b) => a.position - b.position);
  }, [templates]);

  const handleMoveTask = useCallback(
    (taskId: string, toStatus: TaskStatus, toPosition: number) => {
      queryClient.setQueryData<Task[]>(["tasks", projectId], (oldTasks) => {
        if (!oldTasks) {
          return oldTasks;
        }

        const taskToMove = oldTasks.find((t) => t.id === taskId);
        if (!taskToMove) {
          return oldTasks;
        }

        const oldStatus = taskToMove.status;
        const updatedTasks = oldTasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, status: toStatus, position: toPosition };
          }
          return t;
        });

        const tasksInTargetStatus = updatedTasks
          .filter((t) => t.status === toStatus && t.id !== taskId)
          .sort((a, b) => a.position - b.position);

        let newPosition = toPosition;
        for (const t of tasksInTargetStatus) {
          if (t.position >= toPosition) {
            const idx = updatedTasks.findIndex((ut) => ut.id === t.id);
            if (idx !== -1) {
              newPosition++;
              updatedTasks[idx] = { ...updatedTasks[idx], position: newPosition };
            }
          }
        }

        if (oldStatus !== toStatus) {
          const tasksInOldStatus = updatedTasks
            .filter((t) => t.status === oldStatus)
            .sort((a, b) => a.position - b.position);

          tasksInOldStatus.forEach((t, index) => {
            const idx = updatedTasks.findIndex((ut) => ut.id === t.id);
            if (idx !== -1) {
              updatedTasks[idx] = { ...updatedTasks[idx], position: index };
            }
          });
        }

        return updatedTasks;
      });

      setJustDroppedTaskId(taskId);

      moveTask.mutate({
        taskId,
        status: toStatus,
        position: toPosition,
      });
    },
    [moveTask, queryClient, projectId]
  );

  const handleMoveTemplate = useCallback(
    (templateId: string, toPosition: number) => {
      moveTemplate.mutate({
        templateId,
        position: toPosition,
      });
    },
    [moveTemplate]
  );

  const handleTemplateDropOnColumn = useCallback(
    (template: Template, status: TaskStatus) => {
      setAddTaskStatus(status);
      setAddTaskFromTemplate(template);
    },
    []
  );

  const handleAddTask = async (title: string, description: string, images: File[]) => {
    if (!addTaskStatus) {
      return;
    }
    createTask.mutate(
      { title, description: description || undefined, status: addTaskStatus },
      {
        onSuccess: async (task) => {
          if (images.length > 0) {
            await Promise.all(images.map((file) => uploadAttachment(task.id, file)));
          }
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

  const handleAddTemplate = async (title: string, description: string, images: File[]) => {
    createTemplate.mutate(
      { title, description: description || undefined },
      {
        onSuccess: async (template) => {
          if (images.length > 0) {
            await Promise.all(images.map((file) => uploadTemplateAttachment(template.id, file)));
          }
          setShowAddTemplate(false);
        },
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
      <div className="flex-1 pt-0 pb-4 px-4 overflow-auto">
        <div className="flex gap-0 items-stretch min-h-full w-max">
          <TemplateColumn
            templates={sortedTemplates}
            onTemplateClick={setEditingTemplate}
            onAddClick={() => setShowAddTemplate(true)}
            onMoveTemplate={handleMoveTemplate}
            onTemplateDropOnColumn={handleTemplateDropOnColumn}
            isDragging={isDragging}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />
          {COLUMNS.map((column, index) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              onTaskClick={setSelectedTask}
              onDeleteAll={
                column.id !== "in_progress"
                  ? () => deleteAllTasks.mutate(column.id)
                  : undefined
              }
              isDeleting={deleteAllTasks.isPending}
              showBorder={index < COLUMNS.length - 1}
              onMoveTask={handleMoveTask}
              onTemplateDropOnColumn={handleTemplateDropOnColumn}
              isDragging={isDragging}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              justDroppedTaskId={justDroppedTaskId}
              onAddTask={
                column.id !== "in_progress"
                  ? () => setAddTaskStatus(column.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

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

export const Board = forwardRef<BoardRef, BoardProps>(function Board(props, ref) {
  const { projectId } = props;

  return <BoardContent projectId={projectId} boardRef={ref} />;
});

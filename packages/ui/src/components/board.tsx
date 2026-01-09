import { useState, useMemo, forwardRef, useImperativeHandle, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTasksOptions, useCreateTask, useMoveTask, useDeleteAllTasks, useTasksRefetchInterval } from "~/queries/tasks";
import { listTemplatesOptions, useCreateTemplate, useMoveTemplate, useUpdateTemplate } from "~/queries/templates";
import { httpPost } from "~/lib/http";
import type { Attachment } from "~/types";
import { useTaskNotifications } from "~/hooks/use-task-notifications";
import { DragProvider, useDragContext } from "~/hooks/use-drag-and-drop";
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

  const { dragItem, setDragItem } = useDragContext();

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

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort((a, b) => a.position - b.position);
    }

    return grouped;
  }, [tasks]);

  const handleTaskDrop = useCallback(
    (columnId: TaskStatus, taskId: string, position: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return;
      }

      if (columnId === "in_progress") {
        return;
      }

      if (task.status === columnId && task.position === position) {
        return;
      }

      moveTask.mutate({
        taskId,
        status: columnId,
        position,
      });

      setDragItem(null);
    },
    [tasks, moveTask, setDragItem]
  );

  const handleTemplateDrop = useCallback(
    (columnId: TaskStatus) => {
      if (dragItem?.type !== "template") {
        return;
      }

      if (columnId !== "backlog" && columnId !== "ready") {
        return;
      }

      setAddTaskStatus(columnId);
      setAddTaskFromTemplate(dragItem.template);
      setDragItem(null);
    },
    [dragItem, setDragItem]
  );

  const handleTemplateReorder = useCallback(
    (templateId: string, newPosition: number) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) {
        return;
      }

      if (template.position === newPosition) {
        return;
      }

      moveTemplate.mutate({
        templateId,
        position: newPosition,
      });

      setDragItem(null);
    },
    [templates, moveTemplate, setDragItem]
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
      <div className="flex-1 pt-0 pb-4 px-4 overflow-auto">
        <div className="flex gap-0 items-stretch min-h-full w-max">
          <div className="border-r border-zinc-800 pr-3 mr-3 flex flex-col">
            <TemplateColumn
              templates={templates}
              onTemplateClick={setEditingTemplate}
              onAddClick={() => setShowAddTemplate(true)}
              onReorder={handleTemplateReorder}
            />
          </div>
          {COLUMNS.map((column, index) => (
            <div
              key={column.id}
              className={`flex flex-col ${index < COLUMNS.length - 1 ? "border-r border-zinc-800 pr-3 mr-3" : ""}`}
            >
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
                onDrop={(taskId, position) => {
                  if (dragItem?.type === "task") {
                    handleTaskDrop(column.id, taskId, position);
                  } else if (dragItem?.type === "template") {
                    handleTemplateDrop(column.id);
                  }
                }}
              />
            </div>
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

  return (
    <DragProvider>
      <BoardContent projectId={projectId} boardRef={ref} />
    </DragProvider>
  );
});

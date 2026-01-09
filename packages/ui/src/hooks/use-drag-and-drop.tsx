import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Task, TaskStatus, Template } from "~/types";

interface DragContextValue {
  isDragging: boolean;
}

const DragStateContext = createContext<DragContextValue>({ isDragging: false });

export function useDragContext() {
  return useContext(DragStateContext);
}

interface DragProviderProps {
  children: ReactNode;
  tasksByStatus: Record<TaskStatus, Task[]>;
  templates: Template[];
  onMoveTask: (taskId: string, toStatus: TaskStatus, toPosition: number) => void;
  onMoveTemplate: (templateId: string, toPosition: number) => void;
  onTemplateDropOnColumn: (template: Template, status: TaskStatus) => void;
}

export function DragProvider(props: DragProviderProps) {
  const {
    children,
    tasksByStatus,
    templates,
    onMoveTask,
    onMoveTemplate,
    onTemplateDropOnColumn,
  } = props;

  const lastDragIdRef = useRef<string | null>(null);
  const tasksByStatusRef = useRef(tasksByStatus);
  const templatesRef = useRef(templates);

  tasksByStatusRef.current = tasksByStatus;
  templatesRef.current = templates;

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId, type } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const dragKey = `${draggableId}-${destination.droppableId}-${destination.index}`;
    if (lastDragIdRef.current === dragKey) {
      return;
    }
    lastDragIdRef.current = dragKey;
    setTimeout(() => {
      lastDragIdRef.current = null;
    }, 100);

    if (type === "TASK") {
      const targetStatus = destination.droppableId as TaskStatus;

      if (targetStatus === "in_progress") {
        return;
      }

      const targetTasks = tasksByStatusRef.current[targetStatus];
      let targetPosition: number;

      if (targetTasks.length === 0) {
        targetPosition = 0;
      } else if (destination.index >= targetTasks.length) {
        targetPosition = targetTasks[targetTasks.length - 1].position + 1;
      } else {
        targetPosition = targetTasks[destination.index].position;
      }

      onMoveTask(draggableId, targetStatus, targetPosition);
    }

    if (type === "TEMPLATE") {
      const destId = destination.droppableId;

      if (destId === "backlog" || destId === "ready") {
        const template = templatesRef.current.find((t) => t.id === draggableId);
        if (template) {
          onTemplateDropOnColumn(template, destId);
        }
        return;
      }

      if (destId === "templates") {
        const sortedTemplates = [...templatesRef.current].sort((a, b) => a.position - b.position);
        let targetPosition: number;

        if (sortedTemplates.length === 0) {
          targetPosition = 0;
        } else if (destination.index >= sortedTemplates.length) {
          targetPosition = sortedTemplates[sortedTemplates.length - 1].position + 1;
        } else {
          targetPosition = sortedTemplates[destination.index].position;
        }

        onMoveTemplate(draggableId, targetPosition);
      }
    }
  }, [onMoveTask, onMoveTemplate, onTemplateDropOnColumn]);

  return (
    <DragStateContext.Provider value={{ isDragging: false }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {children}
      </DragDropContext>
    </DragStateContext.Provider>
  );
}

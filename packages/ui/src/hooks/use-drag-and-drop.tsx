import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Task, TaskStatus, Template } from "~/types";

type DragItem =
  | { type: "task"; task: Task }
  | { type: "template"; template: Template }
  | null;

type DropTarget =
  | { type: "task"; taskId: string; position: "before" | "after" }
  | { type: "column"; status: TaskStatus }
  | { type: "template"; templateId: string; position: "before" | "after" }
  | null;

interface DragContextValue {
  dragItem: DragItem;
  dropTarget: DropTarget;
  setDragItem: (item: DragItem) => void;
  setDropTarget: (target: DropTarget) => void;
  isDragging: boolean;
}

const DragContext = createContext<DragContextValue | null>(null);

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider(props: DragProviderProps) {
  const { children } = props;

  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  const handleSetDragItem = useCallback((item: DragItem) => {
    setDragItem(item);
    if (!item) {
      setDropTarget(null);
    }
  }, []);

  const value: DragContextValue = {
    dragItem,
    dropTarget,
    setDragItem: handleSetDragItem,
    setDropTarget,
    isDragging: dragItem !== null,
  };

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}

export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDragContext must be used within a DragProvider");
  }
  return context;
}

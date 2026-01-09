import { useState, useRef } from "react";
import { FileText, Trash2 } from "lucide-react";
import { useDeleteTemplate } from "~/queries/templates";
import { useDragContext } from "~/hooks/use-drag-and-drop";
import { ConfirmDialog } from "./confirm-dialog";
import type { Template } from "~/types";

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard(props: TemplateCardProps) {
  const { template, onClick } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const deleteTemplate = useDeleteTemplate();

  const { dragItem, dropTarget, setDragItem, setDropTarget } = useDragContext();

  const isDragging = dragItem?.type === "template" && dragItem.template.id === template.id;
  const isDropTargetBefore =
    dropTarget?.type === "template" &&
    dropTarget.templateId === template.id &&
    dropTarget.position === "before";
  const isDropTargetAfter =
    dropTarget?.type === "template" &&
    dropTarget.templateId === template.id &&
    dropTarget.position === "after";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "template", templateId: template.id }));

    requestAnimationFrame(() => {
      setDragItem({ type: "template", template });
    });
  };

  const handleDragEnd = () => {
    setDragItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragItem || dragItem.type !== "template") {
      return;
    }

    if (dragItem.template.id === template.id) {
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";

    setDropTarget({ type: "template", templateId: template.id, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    if (dropTarget?.type === "template" && dropTarget.templateId === template.id) {
      setDropTarget(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteTemplate.mutate(template.id, {
      onSuccess: () => setShowDeleteConfirm(false),
    });
  };

  return (
    <>
      <div className="relative">
        {isDropTargetBefore && (
          <div className="absolute -top-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10" />
        )}
        <div
          ref={cardRef}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={onClick}
          className={`
            group p-3 rounded-lg border select-none cursor-grab active:cursor-grabbing
            ${isDragging ? "opacity-50" : ""}
            bg-indigo-900/20 border-indigo-700/30 hover:border-indigo-600/50
          `}
        >
          <div className="flex items-start gap-2">
            <FileText className="shrink-0 w-3.5 h-3.5 mt-0.5 text-indigo-400" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm text-zinc-200 font-medium truncate">
                {template.title}
              </h4>
              {template.description && (
                <p className="mt-1 text-xs text-zinc-500 truncate">
                  {template.description}
                </p>
              )}
            </div>
            <button
              onClick={handleDeleteClick}
              className="shrink-0 p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Delete template"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {isDropTargetAfter && (
          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10" />
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Template?"
          message="This will permanently delete this template. This action cannot be undone."
          confirmLabel="Delete"
          isLoading={deleteTemplate.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

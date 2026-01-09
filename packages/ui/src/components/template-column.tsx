import { useState, useRef, useEffect } from "react";
import { Plus, HelpCircle, LayoutTemplate, ChevronLeft } from "lucide-react";
import { useDragContext } from "~/hooks/use-drag-and-drop";
import type { Template } from "~/types";
import { TemplateCard } from "./template-card";

const COLLAPSED_KEY = "claude-board-templates-collapsed";

interface TemplateColumnProps {
  templates: Template[];
  onTemplateClick: (template: Template) => void;
  onAddClick: () => void;
  onReorder?: (templateId: string, newPosition: number) => void;
}

export function TemplateColumn(props: TemplateColumnProps) {
  const { templates, onTemplateClick, onAddClick, onReorder } = props;
  const [showHelp, setShowHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  const [isDropTargetEnd, setIsDropTargetEnd] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const { dragItem, dropTarget } = useDragContext();
  const isDraggingTemplate = dragItem?.type === "template";

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

  const handleToggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(COLLAPSED_KEY, String(newValue));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    if (isDraggingTemplate) {
      e.dataTransfer.dropEffect = "move";

      const hasTemplateDropTarget = dropTarget?.type === "template";
      if (!hasTemplateDropTarget) {
        setIsDropTargetEnd(true);
      } else {
        setIsDropTargetEnd(false);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (columnRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    setIsDropTargetEnd(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTargetEnd(false);

    if (!onReorder || !dragItem || dragItem.type !== "template") {
      return;
    }

    let targetPosition = templates.length;

    if (dropTarget?.type === "template") {
      const targetIndex = templates.findIndex((t) => t.id === dropTarget.templateId);
      if (targetIndex !== -1) {
        targetPosition = dropTarget.position === "before" ? targetIndex : targetIndex + 1;
      }
    }

    onReorder(dragItem.template.id, targetPosition);
  };

  if (isCollapsed) {
    return (
      <div
        className="w-10 shrink-0 flex flex-col items-center py-3 select-none cursor-pointer h-full hover:bg-indigo-900/20 transition-colors"
        onClick={handleToggleCollapse}
        title="Expand templates"
      >
        <div className="flex flex-col items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-indigo-400 font-medium writing-mode-vertical whitespace-nowrap">
            Templates
          </span>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
            {templates.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] select-none flex flex-col">
      <div className="sticky top-0 z-10 bg-zinc-950 flex items-center justify-between py-3 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleCollapse}
            className="p-1 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors"
            title="Collapse templates"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <h3 className="text-sm font-medium text-indigo-400">Templates</h3>
          <div className="relative" ref={helpRef}>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-0.5 text-zinc-600 hover:text-indigo-400 rounded transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {showHelp && (
              <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-indigo-400">Templates</strong> are reusable task blueprints.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                  <li>• Click a template to edit it</li>
                  <li>• Drag to Backlog or Ready to create a task</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        <span className="text-xs text-zinc-600">{templates.length}</span>
      </div>
      <div
        ref={columnRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 px-1"
      >
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => onTemplateClick(template)}
            />
          ))}
        </div>
        {isDropTargetEnd && isDraggingTemplate && templates.length > 0 && (
          <div className="mt-2 h-0.5 bg-indigo-500 rounded-full" />
        )}
        <button
          onClick={onAddClick}
          className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-xs text-indigo-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add template
        </button>
      </div>
    </div>
  );
}

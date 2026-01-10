import { useState, useRef, useEffect, type DragEvent } from "react";
import { Plus, HelpCircle, LayoutTemplate, ChevronLeft } from "lucide-react";
import type { Template, TaskStatus } from "~/types";
import { TemplateCard } from "./template-card";

const COLLAPSED_KEY = "claude-queue-templates-collapsed";
const TEMPLATE_DRAG_TYPE = "application/x-template";

interface TemplateColumnProps {
  templates: Template[];
  onTemplateClick: (template: Template) => void;
  onAddClick: () => void;
  onMoveTemplate: (templateId: string, toPosition: number) => void;
  onTemplateDropOnColumn: (template: Template, status: TaskStatus) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function TemplateColumn(props: TemplateColumnProps) {
  const {
    templates,
    onTemplateClick,
    onAddClick,
    onMoveTemplate,
    onTemplateDropOnColumn: _onTemplateDropOnColumn,
    isDragging: _isDragging,
    onDragStart,
    onDragEnd,
  } = props;

  const [showHelp, setShowHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

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

  const handleDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDropIndex(null);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropIndex(null);
    setDraggedTemplateId(null);

    const data = e.dataTransfer.getData(TEMPLATE_DRAG_TYPE);
    if (!data) {
      return;
    }

    const { templateId } = JSON.parse(data);

    let targetPosition: number;
    if (templates.length === 0) {
      targetPosition = 0;
    } else if (dropIndex === null || dropIndex >= templates.length) {
      targetPosition = templates[templates.length - 1].position + 1;
    } else {
      targetPosition = templates[dropIndex].position;
    }

    onMoveTemplate(templateId, targetPosition);
  };

  const handleTemplateDragStart = (e: DragEvent, template: Template) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(TEMPLATE_DRAG_TYPE, JSON.stringify({
      templateId: template.id,
      template: template,
    }));
    setDraggedTemplateId(template.id);
    onDragStart();
  };

  const handleTemplateDragEnd = () => {
    setDraggedTemplateId(null);
    setDropIndex(null);
    onDragEnd();
  };

  const handleTopDropZoneDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (dropIndex !== 0) {
      setDropIndex(0);
    }
  };

  const handleBottomDropZoneDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const newDropIndex = templates.length;
    if (dropIndex !== newDropIndex) {
      setDropIndex(newDropIndex);
    }
  };

  const handleTemplateDragOver = (e: DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = (rect.top + rect.bottom) / 2;
    const newDropIndex = e.clientY <= midpoint ? index : index + 1;

    if (newDropIndex !== dropIndex) {
      setDropIndex(newDropIndex);
    }
  };

  if (isCollapsed) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="shrink-0 flex flex-col items-center px-2 py-3 select-none cursor-pointer border-r border-zinc-800 hover:bg-indigo-900/20 transition-colors"
        onClick={handleToggleCollapse}
        title="Expand templates"
      >
        <LayoutTemplate className="w-4 h-4 text-indigo-400" />
        <span className="text-xs text-indigo-400 font-medium writing-mode-vertical whitespace-nowrap mt-2">
          Templates
        </span>
        <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded mt-2">
          {templates.length}
        </span>
      </div>
    );
  }

  return (
    <div className="w-[300px] shrink-0 select-none flex flex-col border-r border-zinc-800 pr-3">
      <div className={`sticky top-0 bg-zinc-950 flex items-center justify-between py-3 px-1 ${showHelp ? "z-20" : "z-10"}`}>
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
              className="p-1 text-zinc-600 hover:text-indigo-400 rounded transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 px-1 min-h-[100px] rounded-lg transition-colors"
      >
        <div className="space-y-2">
          <div
            onDragOver={handleTopDropZoneDragOver}
            className="h-1 -mb-1 relative"
          >
            {dropIndex === 0 && draggedTemplateId && templates.length > 0 && templates[0].id !== draggedTemplateId && (
              <div className="absolute top-full left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10" />
            )}
          </div>
          {templates.map((template, index) => {
            const isBeingDragged = template.id === draggedTemplateId;
            const showIndicatorBefore = dropIndex === index && index > 0 && draggedTemplateId !== template.id;

            return (
              <div
                key={template.id}
                onDragOver={(e) => handleTemplateDragOver(e, index)}
                className="relative"
              >
                {showIndicatorBefore && (
                  <div className="absolute -top-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                )}
                <div
                  draggable
                  onDragStart={(e) => handleTemplateDragStart(e, template)}
                  onDragEnd={handleTemplateDragEnd}
                  className={isBeingDragged ? "opacity-50" : ""}
                >
                  <TemplateCard
                    template={template}
                    onClick={() => onTemplateClick(template)}
                  />
                </div>
              </div>
            );
          })}
          <div className="relative">
            {dropIndex !== null && dropIndex >= templates.length && draggedTemplateId && (
              <div className="absolute -top-1 left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-10" />
            )}
            <button
              onClick={onAddClick}
              onDragOver={handleBottomDropZoneDragOver}
              className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-xs text-indigo-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add template
            </button>
          </div>
        </div>
        <div
          onDragOver={handleBottomDropZoneDragOver}
          className="flex-1 min-h-[20px]"
        />
      </div>
    </div>
  );
}

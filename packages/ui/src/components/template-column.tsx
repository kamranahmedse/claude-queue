import { useState, useRef, useEffect } from "react";
import { Plus, HelpCircle, LayoutTemplate, ChevronLeft } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { Template } from "~/types";
import { TemplateCard } from "./template-card";

const COLLAPSED_KEY = "claude-board-templates-collapsed";

interface TemplateColumnProps {
  templates: Template[];
  onTemplateClick: (template: Template) => void;
  onAddClick: () => void;
}

export function TemplateColumn(props: TemplateColumnProps) {
  const { templates, onTemplateClick, onAddClick } = props;

  const [showHelp, setShowHelp] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  });
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

  if (isCollapsed) {
    return (
      <Droppable droppableId="templates" type="TEMPLATE">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              shrink-0 flex flex-col items-center px-2 py-3 select-none cursor-pointer border-r border-zinc-800
              hover:bg-indigo-900/20 transition-colors
              ${snapshot.isDraggingOver ? "bg-indigo-900/20" : ""}
            `}
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
            <div className="hidden">{provided.placeholder}</div>
          </div>
        )}
      </Droppable>
    );
  }

  return (
    <div className="w-[300px] shrink-0 select-none flex flex-col border-r border-zinc-800 pr-3">
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
      <Droppable droppableId="templates" type="TEMPLATE">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 px-1 min-h-[100px] rounded-lg transition-colors
              ${snapshot.isDraggingOver ? "bg-indigo-900/10 ring-2 ring-indigo-500/30 ring-inset" : ""}
            `}
          >
            <div className="space-y-2">
              {templates.map((template, index) => (
                <Draggable
                  key={template.id}
                  draggableId={template.id}
                  index={index}
                >
                  {(dragProvided, dragSnapshot) => {
                    const style = {
                      ...dragProvided.draggableProps.style,
                      transition: dragSnapshot.isDropAnimating ? "transform 0.001s" : dragProvided.draggableProps.style?.transition,
                    };
                    return (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={style}
                      >
                        <TemplateCard
                          template={template}
                          onClick={() => onTemplateClick(template)}
                          isDragging={dragSnapshot.isDragging}
                        />
                      </div>
                    );
                  }}
                </Draggable>
              ))}
            </div>
            {provided.placeholder}
            <button
              onClick={onAddClick}
              className="w-full mt-2 p-2 flex items-center justify-center gap-2 text-xs text-indigo-500 hover:text-indigo-400 hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add template
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}

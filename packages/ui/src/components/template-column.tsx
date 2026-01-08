import { useState, useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, HelpCircle, LayoutTemplate, ChevronLeft, ChevronRight } from "lucide-react";
import type { Template } from "~/types";
import { TemplateCard } from "./template-card";

const COLLAPSED_KEY = "claude-kanban-templates-collapsed";

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
      <div className="w-10 flex flex-col items-center py-3 select-none">
        <button
          onClick={handleToggleCollapse}
          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 rounded-lg transition-colors"
          title="Expand templates"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-zinc-600 writing-mode-vertical">{templates.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] select-none flex flex-col">
      <div className="z-10 bg-zinc-950 flex items-center justify-between py-3 px-1">
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
      <div className="flex-1 px-1">
        <SortableContext
          items={templates.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
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
        </SortableContext>
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

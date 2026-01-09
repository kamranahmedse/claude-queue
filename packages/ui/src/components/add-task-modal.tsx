import { X, FileText } from "lucide-react";
import { TaskTemplateForm } from "./task-template-form";
import type { TaskStatus, Template } from "~/types";

interface AddTaskModalProps {
  status: TaskStatus;
  initialTemplate?: Template | null;
  onClose: () => void;
  onSubmit: (title: string, description: string, images: File[]) => void;
  isLoading: boolean;
}

export function AddTaskModal(props: AddTaskModalProps) {
  const { status, initialTemplate, onClose, onSubmit, isLoading } = props;

  const headerContent = initialTemplate ? (
    <div className="p-2 bg-indigo-900/20 border border-indigo-700/30 rounded-lg flex items-center gap-2">
      <FileText className="w-4 h-4 text-indigo-400" />
      <span className="text-xs text-indigo-300">From template: {initialTemplate.title}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">
            {initialTemplate ? `Create from template` : "Add task"} to {status.replace("_", " ")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <TaskTemplateForm
          initialTitle={initialTemplate?.title || ""}
          initialDescription={initialTemplate?.description || ""}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel="Add task"
          loadingLabel="Adding..."
          titlePlaceholder="What needs to be done?"
          headerContent={headerContent}
        />
      </div>
    </div>
  );
}

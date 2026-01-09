import { X } from "lucide-react";
import { TaskTemplateForm } from "./task-template-form";
import type { Task } from "~/types";

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSubmit: (title: string, description: string, images: File[]) => void;
  isLoading: boolean;
}

export function EditTaskModal(props: EditTaskModalProps) {
  const { task, onClose, onSubmit, isLoading } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">Edit task</h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <TaskTemplateForm
          initialTitle={task.title}
          initialDescription={task.description || ""}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel="Save changes"
          loadingLabel="Saving..."
          titlePlaceholder="What needs to be done?"
        />
      </div>
    </div>
  );
}

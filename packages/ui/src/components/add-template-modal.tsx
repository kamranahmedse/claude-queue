import { X } from "lucide-react";
import { TaskTemplateForm } from "./task-template-form";

interface AddTemplateModalProps {
  onClose: () => void;
  onSubmit: (title: string, description: string, images: File[]) => void;
  isLoading: boolean;
}

export function AddTemplateModal(props: AddTemplateModalProps) {
  const { onClose, onSubmit, isLoading } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">
            Add new template
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <TaskTemplateForm
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel="Add template"
          loadingLabel="Adding..."
          titlePlaceholder="Template title..."
          submitButtonClassName="bg-indigo-600 hover:bg-indigo-500"
        />
      </div>
    </div>
  );
}

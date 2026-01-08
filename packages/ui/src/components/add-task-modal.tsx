import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import type { TaskStatus, Template } from "~/types";

interface AddTaskModalProps {
  status: TaskStatus;
  initialTemplate?: Template | null;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
  isLoading: boolean;
}

export function AddTaskModal(props: AddTaskModalProps) {
  const { status, initialTemplate, onClose, onSubmit, isLoading } = props;

  const [title, setTitle] = useState(initialTemplate?.title || "");
  const [description, setDescription] = useState(initialTemplate?.description || "");

  useEffect(() => {
    if (initialTemplate) {
      setTitle(initialTemplate.title);
      setDescription(initialTemplate.description || "");
    }
  }, [initialTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    onSubmit(title.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
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
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {initialTemplate && (
            <div className="p-2 bg-indigo-900/20 border border-indigo-700/30 rounded-lg flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-indigo-300">From template: {initialTemplate.title}</span>
            </div>
          )}
          <div>
            <label
              htmlFor="title"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-xs text-zinc-500 mb-1.5"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? "Adding..." : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

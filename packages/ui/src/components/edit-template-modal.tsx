import { useState, useEffect } from "react";
import { X, ChevronDown, ImageIcon } from "lucide-react";
import { TemplateImageUpload } from "./template-image-upload";
import type { Template } from "~/types";

interface EditTemplateModalProps {
  template: Template;
  onClose: () => void;
  onSubmit: (title: string, description: string) => void;
  isLoading: boolean;
}

export function EditTemplateModal(props: EditTemplateModalProps) {
  const { template, onClose, onSubmit, isLoading } = props;

  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || "");
  const [showImages, setShowImages] = useState(false);

  useEffect(() => {
    setTitle(template.title);
    setDescription(template.description || "");
  }, [template]);

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
            Edit template
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
              placeholder="Template title..."
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
          <div>
            <button
              type="button"
              onClick={() => setShowImages(!showImages)}
              className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-400 py-2 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Images
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showImages ? "rotate-180" : ""}`}
              />
            </button>
            {showImages && (
              <div className="mt-2">
                <TemplateImageUpload templateId={template.id} />
              </div>
            )}
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isLoading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

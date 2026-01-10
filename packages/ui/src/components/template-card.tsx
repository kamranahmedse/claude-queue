import { useState, type MouseEvent } from "react";
import { FileText, Trash2 } from "lucide-react";
import { useDeleteTemplate } from "~/queries/templates";
import { ConfirmDialog } from "./confirm-dialog";
import type { Template } from "~/types";

interface TemplateCardProps {
  template: Template;
  onClick?: () => void;
}

export function TemplateCard(props: TemplateCardProps) {
  const { template, onClick } = props;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTemplate = useDeleteTemplate();

  const handleDeleteClick = (e: MouseEvent) => {
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
      <div
        onClick={onClick}
        className="group p-3 rounded-lg border select-none cursor-pointer bg-indigo-900/20 border-indigo-700/30 hover:border-indigo-600/50"
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

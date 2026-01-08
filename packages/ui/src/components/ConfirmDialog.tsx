interface ConfirmDialogProps {
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmVariant = "danger",
    isLoading = false,
    onConfirm,
    onCancel,
  } = props;

  const confirmButtonClass = {
    danger: "bg-red-600 hover:bg-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-500",
    default: "bg-zinc-700 hover:bg-zinc-600",
  }[confirmVariant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-lg font-medium text-zinc-100 mb-2">{title}</h3>
        <div className="text-sm text-zinc-400 mb-5">{message}</div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white ${confirmButtonClass} rounded-lg transition-colors`}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

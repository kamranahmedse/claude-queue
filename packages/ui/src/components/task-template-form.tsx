import { useState, useEffect, useCallback, type ReactNode, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { ImageIcon } from "lucide-react";
import { ImageDropzone, cleanupPendingImages, type PendingImage } from "./image-dropzone";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface TaskTemplateFormProps {
  initialTitle?: string;
  initialDescription?: string;
  onSubmit: (title: string, description: string, images: File[]) => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
  loadingLabel: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  submitButtonClassName?: string;
  headerContent?: ReactNode;
}

export function TaskTemplateForm(props: TaskTemplateFormProps) {
  const {
    initialTitle = "",
    initialDescription = "",
    onSubmit,
    onCancel,
    isLoading,
    submitLabel,
    loadingLabel,
    titlePlaceholder = "Enter title...",
    descriptionPlaceholder = "Add more details...",
    submitButtonClassName = "bg-zinc-700 hover:bg-zinc-600",
    headerContent,
  } = props;

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [images, setImages] = useState<PendingImage[]>([]);

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  useEffect(() => {
    return () => {
      cleanupPendingImages(images);
    };
  }, []);

  const handleAddImageFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type)
    );

    if (imageFiles.length === 0) {
      return;
    }

    const newImages: PendingImage[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) {
      return;
    }

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleAddImageFiles(imageFiles);
    }
  }, [handleAddImageFiles]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    const files = images.map((img) => img.file);
    onSubmit(title.trim(), description.trim(), files);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (title.trim()) {
        const files = images.map((img) => img.file);
        onSubmit(title.trim(), description.trim(), files);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} onPaste={handlePaste} className="p-4 space-y-4">
      {headerContent}
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
          placeholder={titlePlaceholder}
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
          placeholder={descriptionPlaceholder}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
        />
      </div>
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Images{images.length > 0 && ` (${images.length})`}</span>
        </div>
        <ImageDropzone
          images={images}
          onImagesChange={setImages}
          compact
        />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || isLoading}
          className={`px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors ${submitButtonClassName}`}
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

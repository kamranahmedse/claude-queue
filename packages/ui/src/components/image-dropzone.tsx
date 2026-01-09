import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, FileImage } from "lucide-react";

export interface PendingImage {
  id: string;
  file: File;
  preview: string;
}

interface ImageDropzoneProps {
  images: PendingImage[];
  onImagesChange: (images: PendingImage[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function ImageDropzone(props: ImageDropzoneProps) {
  const { images, onImagesChange, disabled = false, compact = false } = props;

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = useCallback((files: FileList | File[]) => {
    if (disabled) {
      return;
    }

    const fileArray = Array.from(files).filter((file) =>
      ACCEPTED_TYPES.includes(file.type)
    );

    if (fileArray.length === 0) {
      return;
    }

    const newImages: PendingImage[] = fileArray.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    onImagesChange([...images, ...newImages]);
  }, [images, onImagesChange, disabled]);

  const handleRemove = useCallback((id: string) => {
    if (disabled) {
      return;
    }

    const imageToRemove = images.find((img) => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    onImagesChange(images.filter((img) => img.id !== id));
  }, [images, onImagesChange, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAddFiles(files);
    }
  }, [handleAddFiles, disabled]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (disabled) {
      return;
    }

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
      handleAddFiles(imageFiles);
    }
  }, [handleAddFiles, disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste, disabled]);

  useEffect(() => {
    return () => {
      for (const img of images) {
        URL.revokeObjectURL(img.preview);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const files = e.target.files;
    if (files && files.length > 0) {
      handleAddFiles(files);
    }
    e.target.value = "";
  };

  if (images.length === 0) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border border-dashed rounded-lg text-center transition-colors cursor-pointer
          ${compact ? "p-3" : "p-6"}
          ${isDragging
            ? "border-orange-500 bg-orange-500/10"
            : "border-zinc-700 hover:border-zinc-600"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={`mx-auto mb-1.5 text-zinc-500 ${compact ? "w-4 h-4" : "w-5 h-5"}`} />
        <p className="text-xs text-zinc-500">
          Drop, paste, or click to upload
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {images.map((image) => (
          <div
            key={image.id}
            className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg group"
          >
            <FileImage className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="flex-1 text-xs text-zinc-400 truncate">
              {image.file.name}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border border-dashed rounded-lg p-2 text-center transition-colors cursor-pointer
            ${isDragging
              ? "border-orange-500 bg-orange-500/10"
              : "border-zinc-700 hover:border-zinc-600"
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-zinc-500">
            + Add more images
          </p>
        </div>
      )}
    </div>
  );
}

export function cleanupPendingImages(images: PendingImage[]) {
  for (const img of images) {
    URL.revokeObjectURL(img.preview);
  }
}

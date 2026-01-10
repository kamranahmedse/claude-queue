import { useState, useRef, useCallback, useEffect, type ChangeEvent, type DragEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, Loader2, FileImage, ExternalLink } from "lucide-react";
import { listAttachmentsOptions, useUploadAttachment, useDeleteAttachment, getAttachmentUrl } from "~/queries/attachments";

interface ImageUploadProps {
  taskId: string;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function ImageUpload(props: ImageUploadProps) {
  const { taskId, disabled = false } = props;

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [] } = useQuery(listAttachmentsOptions(taskId));
  const uploadAttachment = useUploadAttachment(taskId);
  const deleteAttachment = useDeleteAttachment(taskId);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (disabled) {
      return;
    }

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        continue;
      }
      uploadAttachment.mutate(file);
    }
  }, [uploadAttachment, disabled]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files);
    }
  }, [handleUpload, disabled]);

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
      handleUpload(imageFiles);
    }
  }, [handleUpload, disabled]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste, disabled]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files);
    }
    e.target.value = "";
  };

  const handleDelete = (attachmentId: string) => {
    if (disabled) {
      return;
    }
    deleteAttachment.mutate(attachmentId);
  };

  const imageAttachments = attachments.filter((a) =>
    ACCEPTED_TYPES.includes(a.mime_type)
  );

  if (imageAttachments.length === 0 && !uploadAttachment.isPending) {
    if (disabled) {
      return (
        <p className="text-xs text-zinc-600">No images attached</p>
      );
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
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
        <Upload className="w-5 h-5 mx-auto mb-1.5 text-zinc-500" />
        <p className="text-xs text-zinc-500">
          Drop, paste, or click to upload
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imageAttachments.length > 0 && (
        <div className="space-y-1.5">
          {imageAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded-lg group"
            >
              <FileImage className="w-4 h-4 text-zinc-500 shrink-0" />
              <a
                href={getAttachmentUrl(attachment.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-zinc-400 hover:text-zinc-300 truncate"
              >
                {attachment.original_name}
              </a>
              <a
                href={getAttachmentUrl(attachment.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-zinc-600 hover:text-zinc-400 rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              {!disabled && (
                <button
                  onClick={() => handleDelete(attachment.id)}
                  disabled={deleteAttachment.isPending}
                  className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadAttachment.isPending && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Uploading...
        </div>
      )}

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
            + Add image
          </p>
        </div>
      )}
    </div>
  );
}

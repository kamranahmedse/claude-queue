import { useState, useRef, useEffect, type ReactNode, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Trash2, Bot, User, Send, Pencil, Eye, History, ChevronDown, Clock, CheckCheck, Inbox, CheckCircle2 } from "lucide-react";
import { taskDetailsOptions, useAddComment, useDeleteComment, useDeleteTask, useUpdateTask, listTasksOptions } from "~/queries/tasks";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import { httpPost } from "~/lib/http";
import { MarkdownRenderer } from "./markdown-renderer";
import { ConfirmDialog } from "./confirm-dialog";
import { ActivityTimeline } from "./activity-timeline";
import { ImageUpload } from "./image-upload";
import { EditTaskModal } from "./edit-task-modal";
import type { Task, TaskStatus, Attachment } from "~/types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadAttachment(taskId: string, file: File): Promise<Attachment> {
  const data = await fileToBase64(file);
  return httpPost<Attachment>(`/attachments/task/${taskId}`, {
    filename: file.name,
    data,
    mimeType: file.type,
  });
}

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: ReactNode; className: string }> = {
  backlog: {
    label: "Backlog",
    icon: <Inbox className="w-3 h-3" />,
    className: "bg-zinc-800 text-zinc-400",
  },
  ready: {
    label: "Ready",
    icon: <CheckCircle2 className="w-3 h-3" />,
    className: "bg-green-900/50 text-green-400",
  },
  in_progress: {
    label: "In Progress",
    icon: <Clock className="w-3 h-3" />,
    className: "bg-orange-900/50 text-orange-400",
  },
  done: {
    label: "Done",
    icon: <CheckCheck className="w-3 h-3" />,
    className: "bg-blue-900/50 text-blue-400",
  },
};

export function TaskDetail(props: TaskDetailProps) {
  const { task: initialTask, onClose } = props;

  const [comment, setComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [currentTask, setCurrentTask] = useState(initialTask);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { data: taskDetails } = useQuery(taskDetailsOptions(currentTask.id));
  const addComment = useAddComment(currentTask.id);
  const deleteComment = useDeleteComment(currentTask.id);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const canEdit = currentTask.status !== "in_progress" && currentTask.status !== "done";
  const isInProgress = currentTask.status === "in_progress";
  const statusConfig = STATUS_CONFIG[currentTask.status];

  const handleSubmitComment = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return;
    }
    addComment.mutate(comment.trim(), {
      onSuccess: () => setComment(""),
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(currentTask.id, {
      onSuccess: () => onClose(),
    });
  };

  const handleSaveEdit = async (title: string, description: string, images: File[]) => {
    updateTask.mutate(
      {
        taskId: currentTask.id,
        title,
        description: description || null,
      },
      {
        onSuccess: async (updatedTask) => {
          if (images.length > 0) {
            await Promise.all(images.map((file) => uploadAttachment(currentTask.id, file)));
            queryClient.invalidateQueries({ queryKey: listAttachmentsOptions(currentTask.id).queryKey });
          }
          setCurrentTask(updatedTask);
          setShowEditModal(false);
          queryClient.invalidateQueries({ queryKey: listTasksOptions(currentTask.project_id).queryKey });
        },
      }
    );
  };

  const comments = taskDetails?.comments || [];
  const activities = taskDetails?.activities || [];

  useEffect(() => {
    if (comments.length > 0 && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [comments.length]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-zinc-800">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${statusConfig.className}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              {currentTask.blocked && (
                <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full">
                  Blocked
                </span>
              )}
            </div>
            <h2 className="text-sm font-medium text-zinc-200 text-balance">
              {currentTask.title}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                title="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentTask.description && (
            <div>
              <h3 className="text-xs text-zinc-500 mb-2">Description</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap text-balance">
                {currentTask.description}
              </p>
            </div>
          )}

          {currentTask.current_activity && (
            <div className="p-3 bg-orange-900/20 rounded-lg">
              <h3 className="text-xs text-orange-400 mb-1">Current Activity</h3>
              <p className="text-sm text-zinc-300">{currentTask.current_activity}</p>
            </div>
          )}

          <div>
            <ImageUpload taskId={currentTask.id} disabled={isInProgress} />
          </div>

          <div>
            <h3 className="text-xs text-zinc-500 mb-3">
              Comments ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-zinc-900/50 rounded-lg group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {c.author === "claude" ? (
                      <Bot className="w-4 h-4 text-orange-400" />
                    ) : (
                      <User className="w-4 h-4 text-zinc-400" />
                    )}
                    <span className="text-xs text-zinc-400">
                      {c.author === "claude" ? "Claude" : "You"}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {formatRelativeTime(c.created_at)}
                    </span>
                    {c.author === "user" && c.seen === true && (
                      <span className="flex items-center gap-1 text-xs text-green-500" title="Claude has seen this comment">
                        <Eye className="w-3 h-3" />
                      </span>
                    )}
                    {c.author === "user" && c.seen === false && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        disabled={deleteComment.isPending}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 rounded transition-all disabled:opacity-50"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <MarkdownRenderer content={c.content} />
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-zinc-600">No comments yet</p>
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-400 py-2 transition-colors"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Activity ({activities.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showActivity ? "rotate-180" : ""}`}
              />
            </button>
            {showActivity && (
              <div className="mt-2">
                <ActivityTimeline activities={activities} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-3">
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            <button
              type="submit"
              disabled={!comment.trim() || addComment.isPending}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete task
          </button>
        </div>
      </div>

      {showEditModal && (
        <EditTaskModal
          task={currentTask}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveEdit}
          isLoading={updateTask.isPending}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete task?"
          message="This action cannot be undone."
          confirmLabel="Delete"
          isLoading={deleteTask.isPending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Trash2, Bot, User, Send, Pencil, Check, Eye, History, ChevronDown, ImageIcon, Clock, CheckCheck, Inbox, CheckCircle2 } from "lucide-react";
import { taskDetailsOptions, useAddComment, useDeleteComment, useDeleteTask, useUpdateTask } from "~/queries/tasks";
import { listAttachmentsOptions } from "~/queries/attachments";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import { MarkdownRenderer } from "./markdown-renderer";
import { ConfirmDialog } from "./confirm-dialog";
import { ActivityTimeline } from "./activity-timeline";
import { ImageUpload } from "./image-upload";
import type { Task, TaskStatus } from "~/types";

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; className: string }> = {
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
  const { task, onClose } = props;

  const [comment, setComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [showActivity, setShowActivity] = useState(false);
  const [showAttachments, setShowAttachments] = useState(true);

  const { data: taskDetails } = useQuery(taskDetailsOptions(task.id));
  const { data: attachments = [] } = useQuery(listAttachmentsOptions(task.id));
  const addComment = useAddComment(task.id);
  const deleteComment = useDeleteComment(task.id);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const canEdit = task.status !== "in_progress";
  const isInProgress = task.status === "in_progress";
  const statusConfig = STATUS_CONFIG[task.status];

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return;
    }
    addComment.mutate(comment.trim(), {
      onSuccess: () => setComment(""),
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(task.id, {
      onSuccess: () => onClose(),
    });
  };

  const handleStartEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      return;
    }
    updateTask.mutate(
      {
        taskId: task.id,
        title: trimmedTitle,
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  };

  const comments = taskDetails?.comments || [];
  const activities = taskDetails?.activities || [];

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
              {task.blocked && (
                <span className="px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full">
                  Blocked
                </span>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-200 focus:outline-none focus:border-zinc-600"
                autoFocus
              />
            ) : (
              <h2 className="text-sm font-medium text-zinc-200 text-balance">
                {task.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                title="Edit task"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || updateTask.isPending}
                className="p-1 text-green-500 hover:text-green-400 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                title="Save changes"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={isEditing ? () => setIsEditing(false) : onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditing ? (
            <div>
              <h3 className="text-xs text-zinc-500 mb-2">Description</h3>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Add a description..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
              />
            </div>
          ) : task.description ? (
            <div>
              <h3 className="text-xs text-zinc-500 mb-2">Description</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap text-balance">
                {task.description}
              </p>
            </div>
          ) : null}

          {task.current_activity && (
            <div className="p-3 bg-orange-900/20 rounded-lg">
              <h3 className="text-xs text-orange-400 mb-1">Current Activity</h3>
              <p className="text-sm text-zinc-300">{task.current_activity}</p>
            </div>
          )}

          <div>
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="w-full flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-400 py-2 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                Images ({attachments.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showAttachments ? "rotate-180" : ""}`}
              />
            </button>
            {showAttachments && (
              <div className="mt-2">
                <ImageUpload taskId={task.id} disabled={isInProgress} />
              </div>
            )}
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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Trash2, Bot, User, Send, Pencil, Check, Eye } from "lucide-react";
import { taskDetailsOptions, useAddComment, useDeleteTask, useUpdateTask } from "~/queries/tasks";
import type { Task } from "~/types";

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetail(props: TaskDetailProps) {
  const { task, onClose } = props;

  const [comment, setComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");

  const { data: taskDetails } = useQuery(taskDetailsOptions(task.id));
  const addComment = useAddComment(task.id);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const canEdit = task.status !== "in_progress";

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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "just now";
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return date.toLocaleDateString();
  };

  const comments = taskDetails?.comments || [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-zinc-800">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 mr-2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-200 focus:outline-none focus:border-zinc-600"
              autoFocus
            />
          ) : (
            <h2 className="text-sm font-medium text-zinc-200 pr-4">
              {task.title}
            </h2>
          )}
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
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="text-zinc-300">{task.status.replace("_", " ")}</span>
            </div>
            {task.blocked && (
              <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded">
                Blocked
              </span>
            )}
          </div>

          {task.current_activity && (
            <div>
              <h3 className="text-xs text-zinc-500 mb-1">Current Activity</h3>
              <p className="text-sm text-zinc-400">{task.current_activity}</p>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800">
            <h3 className="text-xs text-zinc-500 mb-3">
              Comments ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
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
                      {formatTime(c.created_at)}
                    </span>
                    {c.author === "user" && c.seen === true && (
                      <span className="flex items-center gap-1 text-xs text-green-500" title="Claude has seen this comment">
                        <Eye className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-zinc-600">No comments yet</p>
              )}
            </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-lg font-medium text-zinc-100 mb-2">
              Delete task?
            </h3>
            <p className="text-sm text-zinc-400 mb-5">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                {deleteTask.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

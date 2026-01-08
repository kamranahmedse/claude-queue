import {
  Plus,
  ArrowRight,
  Pencil,
  FileText,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "~/hooks/use-relative-time";
import type { TaskActivity, TaskActivityType } from "~/types";

interface ActivityTimelineProps {
  activities: TaskActivity[];
}

function getActivityIcon(type: TaskActivityType) {
  switch (type) {
    case "created":
      return <Plus className="w-3 h-3" />;
    case "status_change":
      return <ArrowRight className="w-3 h-3" />;
    case "title_change":
      return <Pencil className="w-3 h-3" />;
    case "description_change":
      return <FileText className="w-3 h-3" />;
    case "blocked_change":
      return <AlertCircle className="w-3 h-3" />;
    case "comment_added":
      return <MessageSquare className="w-3 h-3" />;
  }
}

function formatStatusLabel(status: string): string {
  return status.replace("_", " ");
}

function getActivityDescription(activity: TaskActivity): string {
  const { type, old_value, new_value } = activity;

  switch (type) {
    case "created":
      return `Task created in ${formatStatusLabel(new_value || "backlog")}`;
    case "status_change":
      return `Moved from ${formatStatusLabel(old_value || "")} to ${formatStatusLabel(new_value || "")}`;
    case "title_change":
      return `Title changed`;
    case "description_change":
      if (!old_value && new_value) {
        return "Description added";
      }
      if (old_value && !new_value) {
        return "Description removed";
      }
      return "Description updated";
    case "blocked_change":
      return new_value === "true" ? "Marked as blocked" : "Unblocked";
    case "comment_added":
      return new_value === "claude" ? "Claude commented" : "User commented";
  }
}

export function ActivityTimeline(props: ActivityTimelineProps) {
  const { activities } = props;

  if (activities.length === 0) {
    return (
      <p className="text-sm text-zinc-600">No activity recorded yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-6 h-6 bg-zinc-800 rounded-full text-zinc-400">
                {getActivityIcon(activity.type)}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-zinc-800 my-1" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <p className="text-sm text-zinc-300">
                {getActivityDescription(activity)}
              </p>
              <p className="text-xs text-zinc-600">
                {formatRelativeTime(activity.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

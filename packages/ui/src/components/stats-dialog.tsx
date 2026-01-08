import { useQuery } from "@tanstack/react-query";
import { X, Clock, CheckCircle, Calendar, TrendingUp, RefreshCw } from "lucide-react";
import { httpGet } from "~/lib/http";
import type { Project } from "~/types";

interface ProjectStats {
  completedToday: number;
  completedThisWeek: number;
  totalCompleted: number;
  totalTimeMs: number;
  avgTimeMs: number;
  tasksWithTime: number;
  tasksByStatus: Record<string, number>;
}

interface StatsDialogProps {
  project: Project;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms === 0) {
    return "—";
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatCard(props: StatCardProps) {
  const { label, value, icon, subtitle } = props;

  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-zinc-100">{value}</div>
      {subtitle && <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export function StatsDialog(props: StatsDialogProps) {
  const { project, onClose } = props;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["project-stats", project.id],
    queryFn: () => httpGet<ProjectStats>(`/projects/${project.id}/stats`),
  });

  const totalTasks = stats
    ? Object.values(stats.tasksByStatus).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-medium text-zinc-100">Project Statistics</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Completed Today"
                  value={stats.completedToday}
                  icon={<Calendar className="w-4 h-4" />}
                />
                <StatCard
                  label="This Week"
                  value={stats.completedThisWeek}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Total Completed"
                  value={stats.totalCompleted}
                  icon={<CheckCircle className="w-4 h-4" />}
                  subtitle={`of ${totalTasks} tasks`}
                />
                <StatCard
                  label="Avg Completion Time"
                  value={formatDuration(stats.avgTimeMs)}
                  icon={<Clock className="w-4 h-4" />}
                  subtitle={stats.tasksWithTime > 0 ? `from ${stats.tasksWithTime} tasks` : undefined}
                />
              </div>

              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-2 text-zinc-400 mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Total Time Tracked</span>
                </div>
                <div className="text-3xl font-semibold text-zinc-100">
                  {formatDuration(stats.totalTimeMs)}
                </div>
                {stats.tasksWithTime > 0 && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Across {stats.tasksWithTime} completed task{stats.tasksWithTime !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <h3 className="text-xs font-medium text-zinc-400 mb-3">Tasks by Status</h3>
                <div className="space-y-2">
                  {[
                    { key: "backlog", label: "Backlog", color: "bg-zinc-600" },
                    { key: "ready", label: "Ready", color: "bg-blue-500" },
                    { key: "in_progress", label: "In Progress", color: "bg-yellow-500" },
                    { key: "done", label: "Done", color: "bg-green-500" },
                  ].map((status) => {
                    const count = stats.tasksByStatus[status.key] || 0;
                    const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;

                    return (
                      <div key={status.key} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-zinc-400">{status.label}</div>
                        <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${status.color} transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-8 text-xs text-zinc-500 text-right">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-zinc-500 py-8">
              Failed to load statistics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

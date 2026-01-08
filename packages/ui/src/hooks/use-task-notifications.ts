import { useEffect, useRef } from "react";
import type { Task } from "~/types";
import { usePlaySound } from "./use-sound";

export function useTaskNotifications(tasks: Task[]): void {
  const playSound = usePlaySound();
  const prevTasksRef = useRef<Map<string, Task>>(new Map());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (tasks.length === 0) {
      return;
    }

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const taskMap = new Map<string, Task>();
      for (const task of tasks) {
        taskMap.set(task.id, task);
      }
      prevTasksRef.current = taskMap;
      return;
    }

    const prevTasks = prevTasksRef.current;

    for (const task of tasks) {
      const prevTask = prevTasks.get(task.id);

      if (prevTask) {
        if (task.status === "done" && prevTask.status !== "done") {
          playSound("complete");
          break;
        }

        if (task.status === "in_progress" && prevTask.status === "ready") {
          playSound("start");
          break;
        }

        if (task.blocked && !prevTask.blocked) {
          playSound("question");
          break;
        }
      }
    }

    const newTaskMap = new Map<string, Task>();
    for (const task of tasks) {
      newTaskMap.set(task.id, task);
    }
    prevTasksRef.current = newTaskMap;
  }, [tasks, playSound]);
}

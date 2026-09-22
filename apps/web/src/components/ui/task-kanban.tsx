"use client";

import React, { useState } from "react";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, User, MoreHorizontal } from "lucide-react";
import { Badge } from "./badge";
import { Avatar } from "./avatar";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

export type TaskItem = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  assignee?: string;
  dueDate?: string;
};

export interface TaskKanbanProps {
  tasks: TaskItem[];
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function TaskKanban({
  tasks,
  onTaskStatusChange,
  onAddTask,
}: TaskKanbanProps) {
  const [taskList, setTaskList] = useState<TaskItem[]>(tasks);

  const columns: { id: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "backlog", label: "Backlog", icon: <Circle className="w-4 h-4 text-slate-400" />, color: "border-slate-300 dark:border-slate-700" },
    { id: "todo", label: "To Do", icon: <AlertCircle className="w-4 h-4 text-amber-500" />, color: "border-amber-400" },
    { id: "in_progress", label: "In Progress", icon: <Clock className="w-4 h-4 text-indigo-500" />, color: "border-indigo-500" },
    { id: "done", label: "Done", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "border-emerald-500" },
  ];

  const handleStatusMove = (taskId: string, targetStatus: TaskStatus) => {
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    if (onTaskStatusChange) {
      onTaskStatusChange(taskId, targetStatus);
    }
  };

  const priorityBadges = {
    low: <Badge variant="secondary">Low</Badge>,
    medium: <Badge variant="indigo">Medium</Badge>,
    high: <Badge variant="danger">High</Badge>,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {columns.map((col) => {
        const colTasks = taskList.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 h-[calc(100vh-280px)] min-h-[450px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                {col.icon}
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {col.label}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-2xs">
                  {colTasks.length}
                </span>
              </div>
              {onAddTask && (
                <button
                  onClick={() => onAddTask(col.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Task Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {colTasks.length > 0 ? (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col gap-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {task.title}
                      </h5>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {priorityBadges[task.priority]}
                      </div>
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <Avatar name={task.assignee} size="xs" />
                        )}
                        {/* Status selector */}
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusMove(
                              task.id,
                              e.target.value as TaskStatus
                            )
                          }
                          className="text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl">
                  No tasks in {col.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

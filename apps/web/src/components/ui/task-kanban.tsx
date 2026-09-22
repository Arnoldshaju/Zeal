"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  const columns: {
    id: TaskStatus;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "backlog",
      label: "Backlog",
      icon: <Circle className="w-4 h-4 text-slate-400" />,
    },
    {
      id: "todo",
      label: "To Do",
      icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    },
    {
      id: "in_progress",
      label: "In Progress",
      icon: <Clock className="w-4 h-4 text-indigo-500" />,
    },
    {
      id: "done",
      label: "Done",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    },
  ];

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const targetStatus = destination.droppableId as TaskStatus;

    setTaskList((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: targetStatus } : t))
    );

    if (onTaskStatusChange) {
      onTaskStatusChange(draggableId, targetStatus);
    }
  };

  const priorityBadges = {
    low: <Badge variant="secondary">Low</Badge>,
    medium: <Badge variant="indigo">Medium</Badge>,
    high: <Badge variant="danger">High</Badge>,
  };

  const filteredTasks = taskList.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority =
      selectedPriority === "all" || t.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by name..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Priority:</span>
          {["all", "high", "medium", "low"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                selectedPriority === p
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Drag and Drop Kanban Canvas */}
      {isClient ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 h-[calc(100vh-320px)] min-h-[480px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
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

                  {/* Droppable Column */}
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto space-y-3 pr-1"
                      >
                        {colTasks.length > 0 ? (
                          colTasks.map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(dragProvided, snapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 group cursor-grab active:cursor-grabbing ${
                                    snapshot.isDragging ? "ring-2 ring-indigo-500 shadow-xl scale-[1.02]" : ""
                                  }`}
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
                                    {task.assignee && (
                                      <Avatar name={task.assignee} size="xs" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl">
                            Drag tasks here
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400">Loading board...</div>
      )}
    </div>
  );
}

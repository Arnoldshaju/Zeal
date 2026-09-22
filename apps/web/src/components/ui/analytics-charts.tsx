"use client";

import React from "react";
import { CheckCircle2, FolderKanban, TrendingUp, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./card";

export interface AnalyticsProps {
  totalTasks?: number;
  completedTasks?: number;
  activeProjects?: number;
  membersCount?: number;
  documentCount?: number;
}

export function AnalyticsCharts({
  totalTasks = 24,
  completedTasks = 18,
  activeProjects = 6,
  membersCount = 5,
  documentCount = 0,
}: AnalyticsProps) {
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projectStats = [
    { name: "Frontend Design Pack", progress: 85, color: "bg-indigo-600" },
    { name: "Django REST API v2", progress: 100, color: "bg-emerald-500" },
    { name: "WebSocket Collaboration Engine", progress: 60, color: "bg-purple-500" },
    { name: "Celery Notification Scheduler", progress: 40, color: "bg-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Velocity Progress Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Sprint Velocity
            </h4>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {completionPercentage}% Done
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Completed Tasks</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {completedTasks} / {totalTasks}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <span>{activeProjects} Active Projects</span>
          <span>{membersCount} Team Contributors</span>
        </div>
      </Card>

      {/* Project Completion Breakdown */}
      <Card className="p-6 lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Deliverables Progress
            </h4>
          </div>
          <span className="text-xs text-slate-400">Updated Live</span>
        </div>

        <div className="space-y-3">
          {projectStats.map((proj, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {proj.name}
                </span>
                <span className="font-bold text-slate-600 dark:text-slate-400">
                  {proj.progress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${proj.color} rounded-full transition-all duration-500`}
                  style={{ width: `${proj.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

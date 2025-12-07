"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import {
  generatePatientTasks,
  getPatientTasks,
  updateTaskCompletion,
  canGenerateTasks,
  TaskGroup,
} from "@/app/_apis/patientTasks";

interface PatientTasksProps {
  patientUserId: number;
}

export const PatientTasks: React.FC<PatientTasksProps> = ({ patientUserId }) => {
  const [taskGroup, setTaskGroup] = useState<TaskGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [patientUserId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const tasks = await getPatientTasks(patientUserId);
      setTaskGroup(tasks);

      // Check if we can generate new tasks
      const canGenerateResponse = await canGenerateTasks(patientUserId);
      setCanGenerate(canGenerateResponse.can_generate);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const newTaskGroup = await generatePatientTasks(patientUserId);
      setTaskGroup(newTaskGroup);
      setCanGenerate(false);
      toast.success("4 AI tasks generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate tasks:", error);
      toast.error(error.response?.data?.detail || "Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskToggle = async (taskId: number, currentStatus: boolean) => {
    setUpdatingTaskId(taskId);
    try {
      const updatedTask = await updateTaskCompletion(taskId, !currentStatus);

      // Update local state
      setTaskGroup((prev) => {
        if (!prev) return prev;

        const updatedTasks = prev.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        );

        const allCompleted = updatedTasks.every((task) => task.is_completed);

        return {
          ...prev,
          tasks: updatedTasks,
          all_completed: allCompleted,
        };
      });

      // Check if all tasks are completed
      const allCompleted = taskGroup?.tasks.every(
        (task) => task.id === taskId ? !currentStatus : task.is_completed
      );

      if (allCompleted) {
        toast.success("All tasks completed! You can now generate new tasks.");
        setCanGenerate(true);
      } else {
        toast.success("Task updated successfully");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">AI-Generated Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#388fe5]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#388fe5] rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">AI Tasks</CardTitle>
          </div>
          {taskGroup && taskGroup.all_completed && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#388fe5]" />
              <span className="text-xs font-medium text-green-700">Complete</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!taskGroup ? (
          // No tasks yet - show generate button
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No tasks generated yet</p>
            <Button
              onClick={handleGenerateTasks}
              disabled={generating}
              className="bg-[#388fe5] hover:bg-[#6fb043]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate 4 AI Tasks
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Task List */}
            <div className="space-y-3">
              {taskGroup.tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.is_completed
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.is_completed}
                    onCheckedChange={() => handleTaskToggle(task.id, task.is_completed)}
                    disabled={updatingTaskId === task.id}
                    className="mt-1"
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-gray-700">
                        {index + 1}.
                      </span>
                      <span
                        className={`text-sm ${task.is_completed
                          ? "line-through text-gray-500"
                          : "text-gray-900"
                          }`}
                      >
                        {task.task_description}
                      </span>
                    </div>
                    {task.completed_at && (
                      <p className="text-xs text-[#388fe5] mt-1 ml-6">
                        Completed on {new Date(task.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </label>
                  {updatingTaskId === task.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Generate New Tasks Button */}
            {canGenerate && taskGroup.all_completed && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerateTasks}
                  disabled={generating}
                  className="w-full bg-[#388fe5] hover:bg-[#6fb043]"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating New Tasks...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate 4 New AI Tasks
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>
                  {taskGroup.tasks.filter((t) => t.is_completed).length} / {taskGroup.tasks.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#388fe5] h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(taskGroup.tasks.filter((t) => t.is_completed).length /
                      taskGroup.tasks.length) *
                      100
                      }%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

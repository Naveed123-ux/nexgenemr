"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  createSessionPattern,
  fetchSessionPatterns,
  deleteSessionPattern,
  clearCreateStatus,
  SessionCreateRequest,
  DayOfWeek,
  SessionType,
} from "@/store/slices/sessionsSlice";
import {
  SessionFormData,
  SlotConfig,
  validateSessionForm,
  formatValidationErrors,
  hasFieldError,
  getFieldErrorMessage,
  validateField,
  validateCrossFields,
  ValidationError as FieldValidationError
} from "@/lib/session-validation";
import { SessionManagementWizardProps } from "@/lib/session-api-types";
import { buildSessionRequest } from "@/lib/session-request-builder";
import { useErrorHandler, useAsyncErrorHandler, useErrorMonitor } from "@/hooks/useErrorHandler";
import toast from "react-hot-toast";
import { InfinitySpin } from "react-loader-spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  Plus,
  X,
  MapPin,
  Video,
  Info,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  RefreshCw,
  HelpCircle,
  Eye,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AddSlotDialog from "./add-slot-dialog";
import DayScheduler from "./day-scheduler";

const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const fullDays: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekOptions = ["first", "second", "third", "fourth", "last"] as const;

export default function SessionManagementWizard() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    patterns,
    status,
    createStatus,
    deleteStatus,
    error,
    createError,
    deleteError
  } = useSelector((state: RootState) => state.sessions);

  // Error handling hooks
  const { handleError, handleSuccess } = useErrorHandler();
  const { handleAsyncResult } = useAsyncErrorHandler();

  // UI State
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patternToDelete, setPatternToDelete] = useState<string | null>(null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotConfig | null>(null);
  const [quickSlotTime, setQuickSlotTime] = useState<string>("");

  // Enhanced Form State matching SessionFormData interface
  const [formData, setFormData] = useState<SessionFormData>({
    sessionName: "",
    sessionType: "on_site",
    startTime: "09:00",
    endTime: "17:00",
    patternType: "simple",
    // Simple pattern fields
    dayOfWeek: "Monday",
    durationWeeks: 4,
    // Advanced pattern fields
    recurrenceType: "weekly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    selectedDays: ["Mon"],
    monthDays: [1],
    week: "first",
    weekDay: "Mon",
    // Slots
    slots: []
  });

  // Enhanced validation state
  const [validationErrors, setValidationErrors] = useState<FieldValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPatternPreview, setShowPatternPreview] = useState(false);
  const [showHelpTips, setShowHelpTips] = useState(false);

  // Legacy state for backward compatibility (will be removed)
  const monthDaysInput = formData.monthDays?.join(", ") || "1";

  // Monitor errors from Redux state
  useErrorMonitor([error, createError, deleteError]);

  // Fetch patterns on mount
  useEffect(() => {
    dispatch(fetchSessionPatterns());
  }, [dispatch]);

  // Handle create status changes with enhanced feedback
  useEffect(() => {
    if (createStatus === "succeeded") {
      handleSuccess(
        "Session pattern created successfully!",
        "Sessions have been generated and are ready for booking."
      );
      resetForm();
      setIsValidating(false);
      dispatch(clearCreateStatus());
      dispatch(fetchSessionPatterns());

      // Switch to manage tab to show the created pattern
      setActiveTab("manage");
    } else if (createStatus === "failed" && createError) {
      // Error is already handled by useErrorMonitor, just clear the status
      dispatch(clearCreateStatus());
      setIsValidating(false);
    }
  }, [createStatus, createError, dispatch, handleSuccess]);

  // Handle delete status changes with enhanced feedback
  useEffect(() => {
    if (deleteStatus === "succeeded") {
      handleSuccess("Pattern deleted successfully");
      dispatch(fetchSessionPatterns());
      setDeleteDialogOpen(false);
      setPatternToDelete(null);
    } else if (deleteStatus === "failed" && deleteError) {
      // Error is already handled by useErrorMonitor, just clear the status
      setDeleteDialogOpen(false);
      setPatternToDelete(null);
    }
  }, [deleteStatus, deleteError, dispatch, handleSuccess]);

  // Enhanced form update handlers with real-time validation
  const updateFormData = (updates: Partial<SessionFormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);

    // Trigger real-time validation for changed fields
    const changedFields = Object.keys(updates);
    changedFields.forEach(fieldName => {
      // Mark field as touched
      setTouchedFields(prev => new Set([...prev, fieldName]));

      // Validate the specific field
      validateFieldRealTime(fieldName, updates[fieldName as keyof SessionFormData], newFormData);
    });

    // Run cross-field validation
    validateCrossFieldsRealTime(newFormData);
  };

  // Real-time field validation
  const validateFieldRealTime = (fieldName: string, value: any, currentFormData: SessionFormData) => {
    const fieldValidationErrors = validateField(fieldName, value, currentFormData);

    setFieldErrors(prev => {
      const newFieldErrors = { ...prev };

      if (fieldValidationErrors.length > 0) {
        newFieldErrors[fieldName] = fieldValidationErrors[0].message;
      } else {
        delete newFieldErrors[fieldName];
      }

      return newFieldErrors;
    });
  };

  // Real-time cross-field validation
  const validateCrossFieldsRealTime = (currentFormData: SessionFormData) => {
    const crossFieldErrors = validateCrossFields(currentFormData);

    setFieldErrors(prev => {
      const newFieldErrors = { ...prev };

      // Clear previous cross-field errors
      ['timeRange', 'patternType', 'endDate'].forEach(field => {
        delete newFieldErrors[field];
      });

      // Add new cross-field errors
      crossFieldErrors.forEach(error => {
        newFieldErrors[error.field] = error.message;
      });

      return newFieldErrors;
    });
  };

  // Handle field blur for validation
  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
    validateFieldRealTime(fieldName, formData[fieldName as keyof SessionFormData], formData);
  };

  const resetForm = () => {
    setFormData({
      sessionName: "",
      sessionType: "on_site",
      startTime: "09:00",
      endTime: "17:00",
      patternType: "simple",
      dayOfWeek: "Monday",
      durationWeeks: 4,
      recurrenceType: "weekly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      selectedDays: ["Mon"],
      monthDays: [1],
      week: "first",
      weekDay: "Mon",
      slots: []
    });
    setValidationErrors([]);
    setFieldErrors({});
    setTouchedFields(new Set());
  };

  // Pattern type switching with field clearing
  const handlePatternTypeChange = (newPatternType: 'simple' | 'advanced') => {
    if (newPatternType === formData.patternType) return;

    const updates: Partial<SessionFormData> = { patternType: newPatternType };

    if (newPatternType === 'simple') {
      // Clear advanced pattern fields
      updates.recurrenceType = undefined;
      updates.startDate = undefined;
      updates.endDate = undefined;
      updates.selectedDays = undefined;
      updates.monthDays = undefined;
      updates.week = undefined;
      updates.weekDay = undefined;

      // Set default simple pattern values if not set
      if (!formData.dayOfWeek) updates.dayOfWeek = "Monday";
      if (!formData.durationWeeks) updates.durationWeeks = 4;
    } else {
      // Clear simple pattern fields
      updates.dayOfWeek = undefined;
      updates.durationWeeks = undefined;

      // Set default advanced pattern values if not set
      if (!formData.recurrenceType) updates.recurrenceType = "weekly";
      if (!formData.startDate) updates.startDate = new Date().toISOString().split("T")[0];
      if (!formData.selectedDays) updates.selectedDays = ["Mon"];
    }

    updateFormData(updates);
  };

  const handleAddSlot = (slot: SlotConfig) => {
    if (editingSlot) {
      // Update existing slot
      updateFormData({
        slots: (formData.slots || []).map((s: SlotConfig) =>
          s.id === editingSlot.id ? { ...slot, id: editingSlot.id } : s
        )
      });
      setEditingSlot(null);
      toast.success("Slot updated successfully", { duration: 2000 });
    } else {
      // Add new slot
      const newSlot = { ...slot, id: `slot-${Date.now()}` };
      updateFormData({
        slots: [...(formData.slots || []), newSlot]
      });
      toast.success("Slot added successfully", { duration: 2000 });
    }
  };

  const handleDeleteSlot = (id: string) => {
    const slotToDelete = (formData.slots || []).find((s: SlotConfig) => s.id === id);
    updateFormData({
      slots: (formData.slots || []).filter((s: SlotConfig) => s.id !== id)
    });
    toast.success(`Slot "${slotToDelete?.title || 'Unknown'}" removed`, { duration: 2000 });
  };

  const handleEditSlot = (slot: SlotConfig) => {
    setEditingSlot(slot);
    setSlotDialogOpen(true);
  };

  const handleTimeSlotClick = (time: string) => {
    setQuickSlotTime(time);
    setEditingSlot(null); // Ensure we're in add mode
    setSlotDialogOpen(true);
  };

  const handleSlotDialogClose = () => {
    setSlotDialogOpen(false);
    setEditingSlot(null);
    setQuickSlotTime("");
  };

  const toggleDay = (day: string) => {
    const currentDays = formData.selectedDays || [];
    const newDays = currentDays.includes(day as any)
      ? currentDays.filter((d: string) => d !== day)
      : [...currentDays, day as any];
    updateFormData({ selectedDays: newDays });
  };

  const parseMonthDays = (input: string): number[] => {
    const days = input
      .split(",")
      .map((d: string) => parseInt(d.trim()))
      .filter((d: number) => !isNaN(d) && d >= 1 && d <= 31);
    return [...new Set(days)].sort((a: number, b: number) => a - b);
  };

  const handleMonthDaysChange = (input: string) => {
    const monthDays = parseMonthDays(input);
    updateFormData({ monthDays });
  };

  // Debounced validation effect for comprehensive form validation
  useEffect(() => {
    if (isValidating) {
      const timeoutId = setTimeout(() => {
        const validation = validateSessionForm(formData);
        setValidationErrors(validation.errors);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isValidating]);

  const handleSubmit = async () => {
    // Enable validation mode
    setIsValidating(true);

    try {
      // Clear previous validation errors
      setValidationErrors([]);

      // Comprehensive form validation
      const validation = validateSessionForm(formData);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);

        // Use the new error handler for validation errors
        handleError({
          message: validation.errors[0]?.message || "Please fix the form errors",
          type: 'validation'
        });

        // Focus on first error field if possible
        const firstErrorField = validation.errors[0]?.field;
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          element?.focus();
        }

        setIsValidating(false);
        return;
      }

      // Build API request payload
      const requestResult = buildSessionRequest(formData, {
        excludeEmptyFields: true,
        validateBeforeBuild: true
      });

      if (!requestResult.success) {
        const errorMessage = requestResult.errors?.join('\n') || 'Failed to build request payload';
        const buildErrors: FieldValidationError[] = (requestResult.errors || ['Failed to build request']).map(msg => ({
          field: 'general',
          message: msg
        }));
        setValidationErrors(buildErrors);

        // Use the new error handler for request building errors
        handleError({
          message: errorMessage,
          type: 'validation'
        });

        setIsValidating(false);
        return;
      }

      // Log the request for debugging (remove in production)
      console.log('Session creation request:', requestResult.request);

      // Dispatch the create action with the unified API format
      const result = await dispatch(createSessionPattern(requestResult.request!));

      // Handle the async result
      handleAsyncResult(result, undefined, {
        action: 'createSessionPattern',
        formData: formData
      });

    } catch (error) {
      console.error('Form submission error:', error);

      // Use the new error handler for unexpected errors
      handleError({
        message: 'An unexpected error occurred while submitting the form.',
        type: 'validation'
      });

      setValidationErrors([{
        field: 'general',
        message: 'An unexpected error occurred'
      }]);
      setIsValidating(false);
    }
  };

  // Enhanced form reset with confirmation
  const handleReset = () => {
    if (formData.sessionName || (formData.slots && formData.slots.length > 0)) {
      if (!confirm('Are you sure you want to reset the form? All entered data will be lost.')) {
        return;
      }
    }

    resetForm();
    toast.success('Form reset successfully', { duration: 2000 });
  };

  const handleDeletePattern = (recurrenceGroupId: string) => {
    setPatternToDelete(recurrenceGroupId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (patternToDelete) {
      const result = await dispatch(deleteSessionPattern(patternToDelete));

      // Handle the async result
      handleAsyncResult(result, undefined, {
        action: 'deleteSessionPattern',
        recurrenceGroupId: patternToDelete
      });
    }
  };

  // Pattern preview and guidance functions
  const generatePatternPreview = (): string[] => {
    const previews: string[] = [];

    if (formData.patternType === 'simple' && formData.dayOfWeek && formData.durationWeeks) {
      const startDate = new Date();
      const dayIndex = fullDays.indexOf(formData.dayOfWeek);

      for (let week = 0; week < Math.min(formData.durationWeeks, 4); week++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(startDate.getDate() + (dayIndex - startDate.getDay() + 7) % 7 + (week * 7));

        previews.push(
          `${sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          })} at ${formData.startTime} - ${formData.endTime}`
        );
      }

      if (formData.durationWeeks > 4) {
        previews.push(`... and ${formData.durationWeeks - 4} more sessions`);
      }
    } else if (formData.patternType === 'advanced' && formData.recurrenceType && formData.startDate) {
      const startDate = new Date(formData.startDate);

      if (formData.recurrenceType === 'daily') {
        for (let day = 0; day < 7; day++) {
          const sessionDate = new Date(startDate);
          sessionDate.setDate(startDate.getDate() + day);

          previews.push(
            `${sessionDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            })} at ${formData.startTime} - ${formData.endTime}`
          );
        }
        previews.push('... continuing daily');
      } else if (formData.recurrenceType === 'weekly' && formData.selectedDays?.length) {
        const currentWeek = new Date(startDate);
        currentWeek.setDate(startDate.getDate() - startDate.getDay());

        formData.selectedDays.forEach((day) => {
          const dayIndex = shortDays.indexOf(day as any);
          const sessionDate = new Date(currentWeek);
          sessionDate.setDate(currentWeek.getDate() + dayIndex);

          if (sessionDate >= startDate) {
            previews.push(
              `${sessionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })} at ${formData.startTime} - ${formData.endTime}`
            );
          }
        });
        previews.push('... repeating weekly');
      } else if (formData.recurrenceType === 'monthly' && formData.monthDays?.length) {
        const currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        formData.monthDays.slice(0, 3).forEach((day: number) => {
          const sessionDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

          if (sessionDate >= startDate) {
            previews.push(
              `${sessionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })} at ${formData.startTime} - ${formData.endTime}`
            );
          }
        });

        if (formData.monthDays.length > 3) {
          previews.push(`... and ${formData.monthDays.length - 3} more days each month`);
        }
        previews.push('... repeating monthly');
      }
    }

    return previews;
  };

  const getPatternSummary = (): string => {
    if (formData.patternType === 'simple' && formData.dayOfWeek && formData.durationWeeks) {
      return `${formData.durationWeeks} sessions every ${formData.dayOfWeek} from ${formData.startTime} to ${formData.endTime}`;
    } else if (formData.patternType === 'advanced' && formData.recurrenceType) {
      let summary = '';

      if (formData.recurrenceType === 'daily') {
        summary = `Daily sessions from ${formData.startTime} to ${formData.endTime}`;
      } else if (formData.recurrenceType === 'weekly' && formData.selectedDays?.length) {
        const daysList = formData.selectedDays.join(', ');
        summary = `Weekly sessions on ${daysList} from ${formData.startTime} to ${formData.endTime}`;
      } else if (formData.recurrenceType === 'monthly' && formData.monthDays?.length) {
        const daysList = formData.monthDays.join(', ');
        summary = `Monthly sessions on day(s) ${daysList} from ${formData.startTime} to ${formData.endTime}`;
      }

      if (formData.startDate) {
        summary += ` starting ${new Date(formData.startDate).toLocaleDateString()}`;
      }

      if (formData.endDate) {
        summary += ` until ${new Date(formData.endDate).toLocaleDateString()}`;
      }

      return summary;
    }

    return 'Configure your pattern to see a summary';
  };

  const getFieldHelpText = (fieldName: string): string => {
    const helpTexts: Record<string, string> = {
      sessionName: 'Choose a clear, descriptive name that helps you identify this session pattern. Examples: "Monday Morning Clinic", "Weekly Consultations", "Emergency Hours"',
      patternType: 'Simple patterns repeat the same day each week. Advanced patterns offer more flexibility with daily, weekly, or monthly schedules.',
      sessionType: 'On-site sessions are held at your practice location. Off-site sessions include telehealth, home visits, or external locations.',
      startTime: 'The time when your session begins. This will be the earliest time patients can book appointments.',
      endTime: 'The time when your session ends. This will be the latest time for appointments in this session.',
      dayOfWeek: 'Select which day of the week this session will repeat on.',
      durationWeeks: 'How many weeks should this pattern continue? You can create up to 52 weeks (1 year) of sessions.',
      recurrenceType: 'Daily: Sessions every day. Weekly: Sessions on specific days of the week. Monthly: Sessions on specific dates each month.',
      startDate: 'The first date when sessions should begin. Cannot be in the past.',
      endDate: 'The last date for sessions. Leave empty to continue indefinitely.',
      selectedDays: 'Choose which days of the week to create sessions. You can select multiple days.',
      monthDays: 'Enter the day numbers (1-31) when sessions should occur each month. For example: 1, 15, 30 for sessions on the 1st, 15th, and 30th of each month.'
    };

    return helpTexts[fieldName] || '';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">
              Session Management
            </h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <p className="text-sm">Toggle help tips and guidance throughout the form</p>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpTips(!showHelpTips)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showHelpTips ? 'Hide Tips' : 'Show Tips'}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Create recurring session patterns and manage your availability
          </p>
          {showHelpTips && (
            <Alert className="mt-3 bg-blue-50 border-blue-200">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-medium mb-1">Quick Start Guide:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Use <strong>Simple Weekly</strong> for regular weekly sessions (e.g., every Monday)</li>
                  <li>Use <strong>Advanced</strong> for complex schedules (multiple days, monthly patterns)</li>
                  <li>Add slots to create bookable time segments within your sessions</li>
                  <li>Preview your pattern before creating to ensure it's correct</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => dispatch(fetchSessionPatterns())}
            variant="outline"
            size="sm"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "create" | "manage")}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Pattern
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
          >
            <CalendarRange className="h-4 w-4 mr-2" />
            Manage Patterns
            {patterns.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {patterns.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* CREATE PATTERN TAB */}
        <TabsContent value="create" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-[#388fe5]" />
                    Create New Session Pattern
                  </CardTitle>
                  <CardDescription>
                    Create recurring session patterns with flexible scheduling
                    options
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Create recurring patterns with daily, weekly, or monthly
                        schedules.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      {/* Session Name */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label htmlFor="session-name">Session Name *</Label>
                          {showHelpTips && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs">
                                <p className="text-sm">{getFieldHelpText('sessionName')}</p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <Input
                          id="session-name"
                          placeholder="e.g., Monday Morning Clinic, Weekly Consultations, Emergency Hours"
                          value={formData.sessionName}
                          onChange={(e) => updateFormData({ sessionName: e.target.value })}
                          onBlur={() => handleFieldBlur('sessionName')}
                          className={fieldErrors.sessionName ? 'border-red-500 focus:border-red-500' : ''}
                        />
                        {fieldErrors.sessionName && touchedFields.has('sessionName') && (
                          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {fieldErrors.sessionName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Choose a descriptive name for your session pattern (3-100 characters)
                        </p>
                      </div>

                      {/* Pattern Type Selection */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Label>Pattern Type *</Label>
                          {showHelpTips && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs">
                                <p className="text-sm">{getFieldHelpText('patternType')}</p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => handlePatternTypeChange("simple")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.patternType === "simple"
                              ? "border-[#388fe5] bg-[#388fe5]/10"
                              : "border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <Calendar
                              className={`h-6 w-6 ${formData.patternType === "simple"
                                ? "text-[#388fe5]"
                                : "text-gray-400"
                                }`}
                            />
                            <span className="font-medium">Simple Weekly</span>
                            <span className="text-xs text-gray-500 text-center">
                              Same day each week
                            </span>
                            <span className="text-xs text-blue-600 text-center font-medium">
                              Recommended for regular schedules
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePatternTypeChange("advanced")}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.patternType === "advanced"
                              ? "border-[#388fe5] bg-[#388fe5]/10"
                              : "border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <CalendarClock
                              className={`h-6 w-6 ${formData.patternType === "advanced"
                                ? "text-[#388fe5]"
                                : "text-gray-400"
                                }`}
                            />
                            <span className="font-medium">Advanced</span>
                            <span className="text-xs text-gray-500 text-center">
                              Complex schedules
                            </span>
                            <span className="text-xs text-purple-600 text-center font-medium">
                              Multiple days, monthly patterns
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Session Type */}
                      <div>
                        <Label className="mb-3 block">Session Type *</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => updateFormData({ sessionType: "on_site" })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.sessionType === "on_site"
                              ? "border-[#388fe5] bg-[#388fe5]/10"
                              : "border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <MapPin
                              className={`h-6 w-6 ${formData.sessionType === "on_site"
                                ? "text-[#388fe5]"
                                : "text-gray-400"
                                }`}
                            />
                            <span className="font-medium">On Site</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFormData({ sessionType: "off_site" })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.sessionType === "off_site"
                              ? "border-[#388fe5] bg-[#388fe5]/10"
                              : "border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <Video
                              className={`h-6 w-6 ${formData.sessionType === "off_site"
                                ? "text-[#388fe5]"
                                : "text-gray-400"
                                }`}
                            />
                            <span className="font-medium">
                              Off Site (Telehealth)
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Time Range */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label>Session Time Range *</Label>
                          {showHelpTips && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs">
                                <p className="text-sm">Set the overall time window for your session. You can add specific appointment slots within this time range.</p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start-time" className="text-sm">Start Time *</Label>
                            <Input
                              id="start-time"
                              type="time"
                              value={formData.startTime}
                              onChange={(e) => updateFormData({ startTime: e.target.value })}
                              onBlur={() => handleFieldBlur('startTime')}
                              className={fieldErrors.startTime || fieldErrors.timeRange ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {fieldErrors.startTime && touchedFields.has('startTime') && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.startTime}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="end-time" className="text-sm">End Time *</Label>
                            <Input
                              id="end-time"
                              type="time"
                              value={formData.endTime}
                              onChange={(e) => updateFormData({ endTime: e.target.value })}
                              onBlur={() => handleFieldBlur('endTime')}
                              className={fieldErrors.endTime || fieldErrors.timeRange ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {fieldErrors.endTime && touchedFields.has('endTime') && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                        {fieldErrors.timeRange && (touchedFields.has('startTime') || touchedFields.has('endTime')) && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {fieldErrors.timeRange}
                          </p>
                        )}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600">
                            💡 <strong>Tip:</strong> Sessions must be 15 minutes to 12 hours long.
                            Common session lengths: 2 hours (clinic), 4 hours (half-day), 8 hours (full-day).
                          </p>
                        </div>
                      </div>

                      {/* Simple Pattern Fields */}
                      {formData.patternType === 'simple' && (
                        <>
                          <div>
                            <Label htmlFor="day-of-week">Day of Week *</Label>
                            <Select
                              value={formData.dayOfWeek}
                              onValueChange={(value) => updateFormData({ dayOfWeek: value as DayOfWeek })}
                            >
                              <SelectTrigger
                                id="day-of-week"
                                className={fieldErrors.dayOfWeek ? 'border-red-500 focus:border-red-500' : ''}
                              >
                                <SelectValue placeholder="Select a day" />
                              </SelectTrigger>
                              <SelectContent>
                                {fullDays.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fieldErrors.dayOfWeek && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.dayOfWeek}
                              </p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="duration-weeks">Duration (Weeks) *</Label>
                            <Input
                              id="duration-weeks"
                              type="number"
                              min="1"
                              max="52"
                              value={formData.durationWeeks || ''}
                              onChange={(e) => updateFormData({ durationWeeks: parseInt(e.target.value) || undefined })}
                              onBlur={() => handleFieldBlur('durationWeeks')}
                              placeholder="e.g., 4"
                              className={fieldErrors.durationWeeks ? 'border-red-500 focus:border-red-500' : ''}
                            />
                            {fieldErrors.durationWeeks && touchedFields.has('durationWeeks') && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.durationWeeks}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Number of weeks to repeat (1-52)
                            </p>
                          </div>

                          <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-900">
                              Sessions will be created every <strong>{formData.dayOfWeek}</strong> for{" "}
                              <strong>{formData.durationWeeks || 0} weeks</strong> at{" "}
                              {formData.startTime} - {formData.endTime}
                            </AlertDescription>
                          </Alert>
                        </>
                      )}

                      {/* Advanced Pattern Fields */}
                      {formData.patternType === 'advanced' && (
                        <>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label htmlFor="recurrence-type">
                                Recurrence Pattern *
                              </Label>
                              {showHelpTips && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                                  </PopoverTrigger>
                                  <PopoverContent className="max-w-xs">
                                    <p className="text-sm">{getFieldHelpText('recurrenceType')}</p>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <Select
                              value={formData.recurrenceType}
                              onValueChange={(value) =>
                                updateFormData({ recurrenceType: value as 'daily' | 'weekly' | 'monthly' })
                              }
                            >
                              <SelectTrigger id="recurrence-type">
                                <SelectValue placeholder="Choose recurrence pattern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">
                                  <div className="flex flex-col items-start">
                                    <span>Every Day</span>
                                    <span className="text-xs text-gray-500">Sessions Monday through Sunday</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="weekly">
                                  <div className="flex flex-col items-start">
                                    <span>Specific Days of Week</span>
                                    <span className="text-xs text-gray-500">Choose which days (e.g., Mon, Wed, Fri)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="monthly">
                                  <div className="flex flex-col items-start">
                                    <span>Monthly Pattern</span>
                                    <span className="text-xs text-gray-500">Specific dates each month (e.g., 1st, 15th)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Date Range */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="start-date">Start Date *</Label>
                              <Input
                                id="start-date"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => updateFormData({ startDate: e.target.value })}
                                onBlur={() => handleFieldBlur('startDate')}
                                className={fieldErrors.startDate ? 'border-red-500 focus:border-red-500' : ''}
                              />
                              {fieldErrors.startDate && touchedFields.has('startDate') && (
                                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {fieldErrors.startDate}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="end-date">End Date (Optional)</Label>
                              <Input
                                id="end-date"
                                type="date"
                                value={formData.endDate || ''}
                                onChange={(e) => updateFormData({ endDate: e.target.value || undefined })}
                                onBlur={() => handleFieldBlur('endDate')}
                                className={fieldErrors.endDate ? 'border-red-500 focus:border-red-500' : ''}
                              />
                              {fieldErrors.endDate && touchedFields.has('endDate') && (
                                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {fieldErrors.endDate}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Leave empty for indefinite
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Conditional Fields Based on Advanced Recurrence Type */}
                      {formData.patternType === 'advanced' && formData.recurrenceType === "daily" && (
                        <Alert className="bg-green-50 border-green-200">
                          <CalendarDays className="h-4 w-4 text-[#388fe5]" />
                          <AlertDescription className="text-green-900">
                            Sessions will be created <strong>every day</strong>{" "}
                            from {formData.startDate}
                            {formData.endDate ? ` to ${formData.endDate}` : " onwards"} at{" "}
                            {formData.startTime} - {formData.endTime}
                          </AlertDescription>
                        </Alert>
                      )}

                      {formData.patternType === 'advanced' && formData.recurrenceType === "weekly" && (
                        <div>
                          <Label className="mb-3 block">
                            Select Days of Week *
                          </Label>
                          <div className="grid grid-cols-7 gap-2">
                            {shortDays.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  toggleDay(day);
                                  handleFieldBlur('selectedDays');
                                }}
                                className={`p-3 rounded-lg border-2 font-medium transition-all ${(formData.selectedDays || []).includes(day as any)
                                  ? "border-[#388fe5] bg-[#388fe5] text-white"
                                  : fieldErrors.selectedDays
                                    ? "border-red-300 text-gray-600 hover:border-red-400"
                                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                                  }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                          {fieldErrors.selectedDays && (
                            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.selectedDays}
                            </p>
                          )}
                          {(formData.selectedDays || []).length > 0 && !fieldErrors.selectedDays && (
                            <p className="text-sm text-gray-600 mt-2">
                              Selected:{" "}
                              <strong>{(formData.selectedDays || []).join(", ")}</strong>
                            </p>
                          )}
                        </div>
                      )}

                      {formData.patternType === 'advanced' && formData.recurrenceType === "monthly" && (
                        <div>
                          <Label htmlFor="month-days">Days of Month *</Label>
                          <Input
                            id="month-days"
                            placeholder="e.g., 1, 15, 30"
                            value={monthDaysInput}
                            onChange={(e) => handleMonthDaysChange(e.target.value)}
                            onBlur={() => handleFieldBlur('monthDays')}
                            className={fieldErrors.monthDays ? 'border-red-500 focus:border-red-500' : ''}
                          />
                          {fieldErrors.monthDays && touchedFields.has('monthDays') && (
                            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.monthDays}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Enter comma-separated day numbers (1-31)
                          </p>
                          {(formData.monthDays || []).length > 0 && !fieldErrors.monthDays && (
                            <div className="flex gap-1 flex-wrap mt-2">
                              {(formData.monthDays || []).map((day) => (
                                <Badge key={day} variant="secondary">
                                  {day}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Slots Configuration */}
                      <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-semibold">
                              Slot Configuration (Optional)
                            </Label>
                            {showHelpTips && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                                </PopoverTrigger>
                                <PopoverContent className="max-w-xs">
                                  <p className="text-sm">Slots divide your session into bookable time segments. For example, a 4-hour session could have 8 slots of 30 minutes each for patient appointments.</p>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSlotDialogOpen(true)}
                            className="border-[#388fe5] text-[#388fe5] hover:bg-[#388fe5] hover:text-white"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Slot
                          </Button>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Create specific time slots for different activities within your session
                          </p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 font-medium mb-1">💡 Slot Examples:</p>
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>• <strong>Clinical:</strong> 30-min patient consultations</li>
                              <li>• <strong>Admin:</strong> 15-min documentation time</li>
                              <li>• <strong>Break:</strong> 30-min lunch break</li>
                              <li>• <strong>Unallocated:</strong> Flexible time for walk-ins</li>
                            </ul>
                          </div>
                        </div>

                        {(formData.slots || []).length > 0 && (
                          <div className="space-y-2">
                            {(formData.slots || []).map((slot) => (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-[#388fe5] transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: slot.slot_color }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">
                                        {slot.title}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {slot.slot_type}
                                      </Badge>
                                      {slot.modality && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {slot.modality.replace("_", " ")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {slot.start_time.substring(0, 5)} -{" "}
                                      {slot.end_time.substring(0, 5)} (
                                      {slot.duration} min)
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSlot(slot.id!)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {(formData.slots || []).length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed rounded-lg border-gray-200">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-500">
                              No slots added yet
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Click "Add Slot" to configure bookable time slots
                            </p>
                          </div>
                        )}

                        {/* Validation Errors Display */}
                        {validationErrors.length > 0 && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-900">
                              <div className="space-y-1">
                                <p className="font-medium mb-2">Please fix the following issues:</p>
                                {validationErrors.map((error, index) => (
                                  <div key={index} className="flex items-start gap-2">
                                    <span className="text-red-600 mt-0.5">•</span>
                                    <span>{error.message}</span>
                                  </div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Pattern Preview Section */}
                        <div className="space-y-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => setShowPatternPreview(!showPatternPreview)}
                            disabled={!formData.sessionName || !formData.startTime || !formData.endTime}
                          >
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Pattern Preview & Summary
                            </div>
                            <span className="text-xs text-gray-500">
                              {showPatternPreview ? 'Hide' : 'Show'}
                            </span>
                          </Button>

                          {showPatternPreview && (
                            <div className="space-y-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                                  <Info className="h-4 w-4" />
                                  Pattern Summary
                                </h4>
                                <p className="text-blue-800 text-sm mb-3">
                                  {getPatternSummary()}
                                </p>

                                {formData.slots && formData.slots.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-blue-900 font-medium text-sm mb-2">
                                      Configured Slots ({formData.slots.length}):
                                    </p>
                                    <div className="space-y-1">
                                      {formData.slots.map((slot: SlotConfig, index: number) => (
                                        <div key={slot.id} className="text-xs text-blue-700 flex items-center gap-2">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: slot.slot_color }}
                                          />
                                          <span>
                                            {slot.title} ({slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4" />
                                  Upcoming Sessions Preview
                                </h4>
                                <div className="space-y-1">
                                  {generatePatternPreview().length > 0 ? (
                                    generatePatternPreview().map((preview, index) => (
                                      <p key={index} className="text-sm text-gray-700">
                                        • {preview}
                                      </p>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">
                                      Complete the pattern configuration to see preview
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Form Validation Status */}
                        {Object.keys(fieldErrors).length === 0 && touchedFields.size > 0 && (
                          <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-[#388fe5]" />
                            <AlertDescription className="text-green-900">
                              Form validation passed! Ready to create session pattern.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSubmit}
                        disabled={createStatus === "loading"}
                        className="flex-1 bg-[#388fe5] hover:bg-[#6fb043] disabled:opacity-50"
                      >
                        {createStatus === "loading" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating Pattern...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Create Session Pattern
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={createStatus === "loading"}
                        className="disabled:opacity-50"
                      >
                        Reset
                      </Button>
                    </div>

                    {/* Form Status Indicator */}
                    {isValidating && validationErrors.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating form...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Day Scheduler Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="pt-1">
                  <DayScheduler
                    sessionName={formData.sessionName || "New Session"}
                    sessionType={formData.sessionType}
                    startTime={formData.startTime}
                    endTime={formData.endTime}
                    slots={formData.slots || []}
                    onSlotRemove={handleDeleteSlot}
                    onSlotEdit={handleEditSlot}
                    onTimeSlotClick={handleTimeSlotClick}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* MANAGE PATTERNS TAB */}
        <TabsContent value="manage" className="mt-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-blue-600" />
                    Your Session Patterns
                  </CardTitle>
                  <CardDescription>
                    View and manage your recurring session patterns
                  </CardDescription>
                </div>
                <Button
                  onClick={() => dispatch(fetchSessionPatterns())}
                  variant="outline"
                  size="sm"
                  disabled={status === "loading"}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {status === "loading" && (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <InfinitySpin width="200" color="#388fe5" />
                    <p className="text-sm text-gray-500 mt-4">Loading patterns...</p>
                  </div>
                </div>
              )}

              {status === "failed" && (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Failed to Load Patterns
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {error?.message || "An error occurred while loading your session patterns"}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => dispatch(fetchSessionPatterns())}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={() => setActiveTab("create")}
                      className="bg-[#388fe5] hover:bg-[#6fb043]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Pattern
                    </Button>
                  </div>
                </div>
              )}

              {status === "succeeded" && patterns.length === 0 && (
                <div className="text-center py-12">
                  <CalendarRange className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Patterns Yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first session pattern to get started with scheduling
                  </p>
                  <Button
                    onClick={() => setActiveTab("create")}
                    className="bg-[#388fe5] hover:bg-[#6fb043]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Pattern
                  </Button>
                </div>
              )}

              {status === "succeeded" && patterns.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} found
                    </p>
                    <Button
                      onClick={() => setActiveTab("create")}
                      size="sm"
                      className="bg-[#388fe5] hover:bg-[#6fb043]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Pattern
                    </Button>
                  </div>

                  {patterns.map((pattern) => (
                    <Card
                      key={pattern.recurrence_group_id}
                      className="border-2 hover:border-[#388fe5] transition-all duration-200 hover:shadow-md"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {pattern.name}
                              </h4>
                              <Badge
                                variant={
                                  pattern.session_type === "on_site"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  pattern.session_type === "on_site"
                                    ? "bg-[#388fe5] hover:bg-[#6fb043]"
                                    : "bg-blue-500 hover:bg-blue-600"
                                }
                              >
                                {pattern.session_type === "on_site" ? (
                                  <MapPin className="h-3 w-3 mr-1" />
                                ) : (
                                  <Video className="h-3 w-3 mr-1" />
                                )}
                                {pattern.session_type === "on_site"
                                  ? "On Site"
                                  : "Off Site"}
                              </Badge>
                              {pattern.is_active ? (
                                <Badge
                                  variant="outline"
                                  className="border-green-500 text-green-700 bg-green-50"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-gray-400 text-gray-600"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </div>

                            {/* Enhanced pattern details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>
                                  {pattern.start_time_of_day} - {pattern.end_time_of_day}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                <span>
                                  {pattern.sessions_generated_count || 0} sessions generated
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>
                                  Created: {new Date(pattern.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Recurrence pattern display */}
                            {pattern.recurrence_config && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <CalendarClock className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">
                                    Recurrence Pattern
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <div className="flex flex-wrap gap-4">
                                    <span>
                                      <strong>Type:</strong> {pattern.recurrence_config.duration}
                                    </span>
                                    <span>
                                      <strong>Start:</strong> {pattern.recurrence_config.start_date}
                                    </span>
                                    {pattern.recurrence_config.end_date && (
                                      <span>
                                        <strong>End:</strong> {pattern.recurrence_config.end_date}
                                      </span>
                                    )}
                                  </div>
                                  {pattern.recurrence_config.selected_days && (
                                    <div className="mt-1">
                                      <strong>Days:</strong> {pattern.recurrence_config.selected_days.join(', ')}
                                    </div>
                                  )}
                                  {pattern.recurrence_config.month_days && (
                                    <div className="mt-1">
                                      <strong>Month Days:</strong> {pattern.recurrence_config.month_days.join(', ')}
                                    </div>
                                  )}
                                  {pattern.recurrence_config.week && pattern.recurrence_config.week_day && (
                                    <div className="mt-1">
                                      <strong>Schedule:</strong> {pattern.recurrence_config.week} {pattern.recurrence_config.week_day} of each month
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePattern(pattern.recurrence_group_id)}
                              disabled={deleteStatus === "loading"}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete pattern"
                            >
                              {deleteStatus === "loading" && patternToDelete === pattern.recurrence_group_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete Session Pattern?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete this pattern and all associated sessions.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Warning:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>This action cannot be undone</li>
                      <li>All future sessions will be cancelled</li>
                      <li>Patterns with booked sessions cannot be deleted</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteStatus === "loading"}
              onClick={() => {
                setDeleteDialogOpen(false);
                setPatternToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteStatus === "loading"}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteStatus === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Pattern
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Slot Dialog */}
      <AddSlotDialog
        open={slotDialogOpen}
        onOpenChange={handleSlotDialogClose}
        onSave={handleAddSlot}
        sessionStartTime={formData.startTime}
        sessionEndTime={formData.endTime}
        existingSlots={formData.slots || []}
        editingSlot={editingSlot}
        quickSlotTime={quickSlotTime}
      />
    </div>
  );
}

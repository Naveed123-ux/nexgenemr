"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  FileText,
  Coffee,
  Clock,
  Users,
  Phone,
  Home,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  validateSlot,
  validateSlotOverlaps,
  timeToMinutes,
  isValidTimeFormat,
  SlotConfig
} from "@/lib/session-validation";
import { AddSlotDialogProps } from "@/lib/session-api-types";

// Props interface is now imported from session-api-types

export default function AddSlotDialog({
  open,
  onOpenChange,
  onSave,
  sessionStartTime = "09:00",
  sessionEndTime = "17:00",
  existingSlots = [],
  editingSlot = null,
  quickSlotTime = "",
}: AddSlotDialogProps) {
  const [slotType, setSlotType] = useState<
    "clinical" | "clinicalAdmin" | "break"
  >("clinical");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [slotColor, setSlotColor] = useState("#4CAF50");
  const [modality, setModality] = useState<
    "face_to_face" | "home_visit" | "telephone"
  >("face_to_face");
  const [isBlocked, setIsBlocked] = useState(false);
  const [duration, setDuration] = useState(30);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasOverlap, setHasOverlap] = useState(false);

  // Populate form when editing a slot
  useEffect(() => {
    if (editingSlot && open) {
      // Only set slot type if it's supported by the dialog
      const supportedTypes = ["clinical", "clinicalAdmin", "break"] as const;
      if (supportedTypes.includes(editingSlot.slot_type as any)) {
        setSlotType(editingSlot.slot_type as "clinical" | "clinicalAdmin" | "break");
      } else {
        setSlotType("clinical"); // Default fallback
      }
      setStartTime(editingSlot.start_time);
      setEndTime(editingSlot.end_time);
      setTitle(editingSlot.title);
      setLabel(editingSlot.label || "");
      setSlotColor(editingSlot.slot_color || "#4CAF50");
      setModality(editingSlot.modality || "face_to_face");
      setIsBlocked(editingSlot.is_blocked || false);
      setDuration(editingSlot.duration);
    } else if (quickSlotTime && open) {
      // Set quick slot time and calculate default end time
      setStartTime(quickSlotTime);
      const start = new Date(`2000-01-01T${quickSlotTime}:00`);
      const end = new Date(start.getTime() + 30 * 60000); // Default 30 minutes
      setEndTime(end.toTimeString().slice(0, 5));
      setDuration(30);
    }
  }, [editingSlot, quickSlotTime, open]);

  // Calculate duration and validate when times change
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      const diff = (end.getTime() - start.getTime()) / 60000;
      setDuration(diff > 0 ? diff : 0);
    }

    // Validate slot when times change
    validateCurrentSlot();
  }, [startTime, endTime, title, slotType, modality, sessionStartTime, sessionEndTime, existingSlots]);

  // Update default title when slot type changes
  useEffect(() => {
    switch (slotType) {
      case "clinical":
        if (!title) setTitle("Consultation");
        setSlotColor("#4CAF50");
        break;
      case "clinicalAdmin":
        if (!title) setTitle("Admin Task");
        setSlotColor("#2196F3");
        break;
      case "break":
        if (!title) setTitle("Break");
        setSlotColor("#FF9800");
        break;
    }
  }, [slotType]);

  // Validation function for current slot configuration
  const validateCurrentSlot = () => {
    const errors: string[] = [];

    // Create temporary slot for validation
    const tempSlot: SlotConfig = {
      id: 'temp',
      start_time: startTime,
      end_time: endTime,
      duration,
      title,
      label: label || undefined,
      slot_color: slotColor,
      slot_type: slotType,
      modality: slotType === "clinical" ? modality : undefined,
      is_blocked: isBlocked,
    };

    // Validate individual slot against session time range
    const slotErrors = validateSlot(tempSlot, sessionStartTime, sessionEndTime);
    errors.push(...slotErrors.map(error => error.message));

    // Check for overlaps with existing slots (exclude current slot when editing)
    const slotsToCheck = editingSlot
      ? existingSlots.filter(s => s.id !== editingSlot.id)
      : existingSlots;
    const overlapErrors = validateSlotOverlaps([...slotsToCheck, tempSlot]);
    const hasOverlapWithExisting = overlapErrors.length > 0;
    setHasOverlap(hasOverlapWithExisting);

    if (hasOverlapWithExisting) {
      errors.push("This slot overlaps with an existing slot");
    }

    // Additional API-specific validations
    if (slotType === "clinical" && !modality) {
      errors.push("Modality is required for clinical slots");
    }

    // Validate time format
    if (!isValidTimeFormat(startTime)) {
      errors.push("Invalid start time format");
    }

    if (!isValidTimeFormat(endTime)) {
      errors.push("Invalid end time format");
    }

    // Validate slot falls within session bounds
    if (isValidTimeFormat(startTime) && isValidTimeFormat(sessionStartTime)) {
      if (timeToMinutes(startTime) < timeToMinutes(sessionStartTime)) {
        errors.push("Slot start time cannot be before session start time");
      }
    }

    if (isValidTimeFormat(endTime) && isValidTimeFormat(sessionEndTime)) {
      if (timeToMinutes(endTime) > timeToMinutes(sessionEndTime)) {
        errors.push("Slot end time cannot be after session end time");
      }
    }

    setValidationErrors(errors);
  };

  const handleSave = () => {
    // Final validation before saving
    if (validationErrors.length > 0) {
      return; // Don't save if there are validation errors
    }

    // Format slot data for API request structure
    const slot: SlotConfig = {
      start_time: startTime, // Keep HH:MM format as required by API
      end_time: endTime, // Keep HH:MM format as required by API
      duration,
      title: title.trim(),
      label: label.trim() || undefined, // Exclude empty strings
      slot_color: slotColor,
      slot_type: slotType,
      modality: slotType === "clinical" ? modality : undefined, // Only include for clinical slots
      is_blocked: isBlocked,
    };

    onSave(slot);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSlotType("clinical");
    setStartTime("09:00");
    setEndTime("09:30");
    setTitle("");
    setLabel("");
    setSlotColor("#4CAF50");
    setModality("face_to_face");
    setIsBlocked(false);
    setDuration(30);
    setValidationErrors([]);
    setHasOverlap(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-[#388fe5]" />
            {editingSlot ? "Edit Slot Configuration" : "Add Slot Configuration"}
          </DialogTitle>
        </DialogHeader>

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm">• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Overlap Warning */}
        {hasOverlap && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              This slot overlaps with existing slots. Please adjust the time range.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Slot Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Slot Type *
            </Label>
            <Tabs value={slotType} onValueChange={(v: any) => setSlotType(v)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="clinical"
                  className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Clinical
                </TabsTrigger>
                <TabsTrigger
                  value="clinicalAdmin"
                  className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Admin
                </TabsTrigger>
                <TabsTrigger
                  value="break"
                  className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  Break
                </TabsTrigger>
              </TabsList>

              {/* CLINICAL SLOT */}
              <TabsContent value="clinical" className="mt-6 space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Stethoscope className="h-4 w-4 text-[#388fe5]" />
                  <AlertDescription className="text-green-900">
                    Clinical slots are patient-facing appointments requiring a
                    modality selection.
                  </AlertDescription>
                </Alert>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinical-start">Start Time *</Label>
                    <Input
                      id="clinical-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('start time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clinical-end">End Time *</Label>
                    <Input
                      id="clinical-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('end time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                </div>

                {/* Duration Display */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Duration
                    </span>
                    <Badge variant="secondary" className="text-base">
                      {duration} minutes
                    </Badge>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="clinical-title">Slot Title *</Label>
                  <Input
                    id="clinical-title"
                    placeholder="e.g., Initial Consultation, Follow-up Visit"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Modality */}
                <div>
                  <Label className="mb-3 block">Modality *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setModality("face_to_face")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${modality === "face_to_face"
                        ? "border-[#388fe5] bg-[#388fe5]/10"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <Users
                        className={`h-6 w-6 ${modality === "face_to_face"
                          ? "text-[#388fe5]"
                          : "text-gray-400"
                          }`}
                      />
                      <span className="text-sm font-medium">Face to Face</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModality("home_visit")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${modality === "home_visit"
                        ? "border-[#388fe5] bg-[#388fe5]/10"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <Home
                        className={`h-6 w-6 ${modality === "home_visit"
                          ? "text-[#388fe5]"
                          : "text-gray-400"
                          }`}
                      />
                      <span className="text-sm font-medium">Home Visit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModality("telephone")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${modality === "telephone"
                        ? "border-[#388fe5] bg-[#388fe5]/10"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <Phone
                        className={`h-6 w-6 ${modality === "telephone"
                          ? "text-[#388fe5]"
                          : "text-gray-400"
                          }`}
                      />
                      <span className="text-sm font-medium">Telephone</span>
                    </button>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <Label htmlFor="clinical-label">
                    Custom Label (Optional)
                  </Label>
                  <Input
                    id="clinical-label"
                    placeholder="e.g., New Patient, Urgent"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                {/* Color Picker */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinical-color">Slot Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="clinical-color"
                        type="color"
                        value={slotColor}
                        onChange={(e) => setSlotColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">{slotColor}</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="clinical-blocked"
                        checked={isBlocked}
                        onCheckedChange={(checked) =>
                          setIsBlocked(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="clinical-blocked"
                        className="cursor-pointer font-normal"
                      >
                        Block this slot
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* CLINICAL ADMIN SLOT */}
              <TabsContent value="clinicalAdmin" className="mt-6 space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Administrative clinical slots for paperwork, documentation,
                    or non-patient tasks.
                  </AlertDescription>
                </Alert>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-start">Start Time *</Label>
                    <Input
                      id="admin-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('start time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-end">End Time *</Label>
                    <Input
                      id="admin-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('end time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                </div>

                {/* Duration Display */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Duration
                    </span>
                    <Badge variant="secondary" className="text-base">
                      {duration} minutes
                    </Badge>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="admin-title">Task Title *</Label>
                  <Input
                    id="admin-title"
                    placeholder="e.g., Documentation, Chart Review, Staff Meeting"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Label */}
                <div>
                  <Label htmlFor="admin-label">Custom Label (Optional)</Label>
                  <Input
                    id="admin-label"
                    placeholder="e.g., Priority, Urgent Review"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                {/* Color Picker */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-color">Slot Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="admin-color"
                        type="color"
                        value={slotColor}
                        onChange={(e) => setSlotColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">{slotColor}</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="admin-blocked"
                        checked={isBlocked}
                        onCheckedChange={(checked) =>
                          setIsBlocked(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="admin-blocked"
                        className="cursor-pointer font-normal"
                      >
                        Block this slot
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* BREAK SLOT */}
              <TabsContent value="break" className="mt-6 space-y-4">
                <Alert className="bg-orange-50 border-orange-200">
                  <Coffee className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    Break slots are reserved for rest periods and cannot be
                    booked by patients.
                  </AlertDescription>
                </Alert>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="break-start">Start Time *</Label>
                    <Input
                      id="break-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('start time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="break-end">End Time *</Label>
                    <Input
                      id="break-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={hasOverlap || validationErrors.some(e => e.includes('end time')) ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                </div>

                {/* Duration Display */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Duration
                    </span>
                    <Badge variant="secondary" className="text-base">
                      {duration} minutes
                    </Badge>
                  </div>
                </div>

                {/* Quick Duration Buttons */}
                <div>
                  <Label className="mb-2 block">Quick Duration</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 45, 60].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const start = new Date(`2000-01-01T${startTime}:00`);
                          const end = new Date(start.getTime() + mins * 60000);
                          setEndTime(end.toTimeString().slice(0, 5));
                        }}
                        className={
                          duration === mins
                            ? "bg-[#388fe5] text-white hover:bg-[#6fb043]"
                            : ""
                        }
                      >
                        {mins} min
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="break-title">Break Title *</Label>
                  <Input
                    id="break-title"
                    placeholder="e.g., Lunch Break, Coffee Break"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <Label htmlFor="break-color">Slot Color</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="break-color"
                      type="color"
                      value={slotColor}
                      onChange={(e) => setSlotColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-gray-600">{slotColor}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !title ||
              !startTime ||
              !endTime ||
              duration <= 0 ||
              validationErrors.length > 0 ||
              hasOverlap
            }
            className="bg-[#388fe5] hover:bg-[#6fb043]"
          >
            {editingSlot ? "Update Slot" : "Add Slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  createSessionPattern,
  fetchSessionPatterns,
  deleteSessionPattern,
  clearCreateStatus,
  RecurrenceConfig,
  AdvancedSession,
} from "@/store/slices/sessionsSlice";
import toast from "react-hot-toast";
import { InfinitySpin } from "react-loader-spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Calendar, Clock, Plus, X, GripVertical, Users, MapPin, Video, Info, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Types
interface SlotConfig {
  id: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  duration: number; // in minutes
  title: string;
  label?: string;
  slot_color?: string;
  slot_type: "clinical" | "clinicalAdmin" | "break" | "unallocated";
  modality?: "face_to_face" | "home_visit" | "telephone";
  is_blocked: boolean;
}

interface TimeSlot {
  time: string;
  slotConfig: SlotConfig | null;
  index: number;
}

const SLOT_TYPES = ["clinical", "clinicalAdmin", "break", "unallocated"] as const;
const MODALITIES = ["face_to_face", "home_visit", "telephone"] as const;
const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const SLOT_TYPE_LABELS = {
  clinical: "Clinical",
  clinicalAdmin: "Clinical Admin",
  break: "Break",
  unallocated: "Unallocated"
};
const MODALITY_LABELS = {
  face_to_face: "Face to Face",
  home_visit: "Home Visit",
  telephone: "Telephone"
};
const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekOptions = ["first", "second", "third", "fourth", "last"] as const;

type RecurrenceType = "daily" | "weekly" | "monthly-date" | "monthly-weekday";
type SessionMode = "simple" | "advanced";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CreateSessionWithSlots() {
  const dispatch = useDispatch<AppDispatch>();
  const { patterns, status, createStatus, deleteStatus, error } = useSelector(
    (state: RootState) => state.sessions
  );

  // Session Mode
  const [sessionMode, setSessionMode] = useState<SessionMode>("simple");

  // Simple Session Details
  const [simpleName, setSimpleName] = useState("");
  const [simpleDayOfWeek, setSimpleDayOfWeek] = useState("Monday");
  const [simpleStartTime, setSimpleStartTime] = useState("09:00");
  const [simpleEndTime, setSimpleEndTime] = useState("17:00");
  const [simpleSessionType, setSimpleSessionType] = useState<"on_site" | "off_site">("on_site");
  const [simpleDurationWeeks, setSimpleDurationWeeks] = useState(8);

  // Advanced Session Details
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<"on_site" | "off_site">("on_site");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Recurrence State
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon"]);
  const [monthDays, setMonthDays] = useState<number[]>([1]);
  const [monthDaysInput, setMonthDaysInput] = useState("1");
  const [week, setWeek] = useState<"first" | "second" | "third" | "fourth" | "last">("first");
  const [weekDay, setWeekDay] = useState("Mon");

  // Slot Configuration
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotConfig | null>(null);

  // Slot Dialog State
  const [slotStartTime, setSlotStartTime] = useState("09:00");
  const [slotEndTime, setSlotEndTime] = useState("09:30");
  const [slotTitle, setSlotTitle] = useState("");
  const [slotLabel, setSlotLabel] = useState("");
  const [slotColor, setSlotColor] = useState("#4CAF50");
  const [slotType, setSlotType] = useState<SlotConfig["slot_type"]>("clinical");
  const [slotModality, setSlotModality] = useState<SlotConfig["modality"]>("face_to_face");
  const [slotIsBlocked, setSlotIsBlocked] = useState(false);

  // Generate time slots for the day grid
  const generateTimeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    let current = new Date(start);
    let index = 0;

    while (current < end) {
      const timeStr = current.toTimeString().slice(0, 5);
      slots.push({
        time: timeStr,
        slotConfig: null,
        index: index++,
      });
      current = new Date(current.getTime() + 5 * 60000); // 5-minute intervals
    }

    return slots;
  }, [startTime, endTime]);

  // Distribute slots across the time grid
  const distributedSlots = useMemo(() => {
    const distributed = [...generateTimeSlots];

    slots.forEach((slotConfig) => {
      const startMinutes = parseInt(slotConfig.start_time.split(':')[0]) * 60 + parseInt(slotConfig.start_time.split(':')[1]);
      const endMinutes = parseInt(slotConfig.end_time.split(':')[0]) * 60 + parseInt(slotConfig.end_time.split(':')[1]);
      const sessionStartMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);

      const startIndex = Math.floor((startMinutes - sessionStartMinutes) / 5);
      const slotsNeeded = Math.ceil((endMinutes - startMinutes) / 5);

      for (let j = 0; j < slotsNeeded; j++) {
        if (startIndex + j >= 0 && startIndex + j < distributed.length) {
          distributed[startIndex + j].slotConfig = slotConfig;
        }
      }
    });

    return distributed;
  }, [generateTimeSlots, slots, startTime]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    const totalMinutes = distributedSlots.length * 5;
    const usedMinutes = slots.reduce((acc, slot) => acc + slot.duration, 0);
    const remaining = totalMinutes - usedMinutes;

    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;

    return { hours, minutes, total: remaining };
  }, [distributedSlots, slots]);

  const handleAddSlot = () => {
    setEditingSlot(null);
    resetSlotDialog();
    setSlotDialogOpen(true);
  };

  const handleEditSlot = (slot: SlotConfig) => {
    setEditingSlot(slot);
    setSlotStartTime(slot.start_time.substring(0, 5));
    setSlotEndTime(slot.end_time.substring(0, 5));
    setSlotTitle(slot.title);
    setSlotLabel(slot.label || "");
    setSlotColor(slot.slot_color || "#4CAF50");
    setSlotType(slot.slot_type);
    setSlotModality(slot.modality || "face_to_face");
    setSlotIsBlocked(slot.is_blocked);
    setSlotDialogOpen(true);
  };

  const handleSaveSlot = () => {
    const start = new Date(`2000-01-01T${slotStartTime}:00`);
    const end = new Date(`2000-01-01T${slotEndTime}:00`);
    const duration = (end.getTime() - start.getTime()) / 60000;

    const newSlot: SlotConfig = {
      id: editingSlot?.id || `slot-${Date.now()}`,
      start_time: `${slotStartTime}:00`,
      end_time: `${slotEndTime}:00`,
      duration: duration,
      title: slotTitle,
      label: slotLabel || undefined,
      slot_color: slotColor,
      slot_type: slotType,
      modality: slotType === "clinical" ? slotModality : undefined,
      is_blocked: slotIsBlocked,
    };

    if (editingSlot) {
      setSlots(slots.map(s => s.id === editingSlot.id ? newSlot : s));
    } else {
      setSlots([...slots, newSlot]);
    }

    setSlotDialogOpen(false);
    resetSlotDialog();
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const resetSlotDialog = () => {
    setSlotStartTime("09:00");
    setSlotEndTime("09:30");
    setSlotTitle("");
    setSlotLabel("");
    setSlotColor("#4CAF50");
    setSlotType("clinical");
    setSlotModality("face_to_face");
    setSlotIsBlocked(false);
  };

  const getSlotColor = (slotConfig: SlotConfig | null) => {
    if (!slotConfig) return "bg-white";
    if (slotConfig.slot_type === "break") return "bg-red-100";
    if (slotConfig.slot_type === "clinical") return "bg-green-100";
    if (slotConfig.slot_type === "clinicalAdmin") return "bg-blue-100";
    return "bg-gray-100";
  };

  const getSlotTextColor = (slotConfig: SlotConfig | null) => {
    if (!slotConfig) return "text-gray-400";
    if (slotConfig.slot_type === "break") return "text-red-700";
    return "text-gray-900";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      {/* Main Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-[#388fe5]/10 to-transparent">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#388fe5] rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <CardTitle>Create Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Session Name & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="session-name">Session Name</Label>
                <Input
                  id="session-name"
                  placeholder="e.g., Morning Clinic"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Session Type</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="session-type"
                      checked={sessionType === "on_site"}
                      onChange={() => setSessionType("on_site")}
                      className="w-4 h-4 text-[#388fe5] focus:ring-[#388fe5]"
                    />
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      On Site
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="session-type"
                      checked={sessionType === "off_site"}
                      onChange={() => setSessionType("off_site")}
                      className="w-4 h-4 text-[#388fe5] focus:ring-[#388fe5]"
                    />
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      Off Site
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Recurrence Pattern */}
            <div>
              <Label htmlFor="recurrence-type">Recurrence Pattern</Label>
              <Select
                value={recurrenceType}
                onValueChange={(value) => setRecurrenceType(value as RecurrenceType)}
              >
                <SelectTrigger id="recurrence-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Every Day</SelectItem>
                  <SelectItem value="weekly">Specific Days of Week</SelectItem>
                  <SelectItem value="monthly-date">Specific Dates of Month</SelectItem>
                  <SelectItem value="monthly-weekday">Specific Week/Day of Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date (Optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Conditional Recurrence Fields - will be added here */}

            {/* Slot Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base">Slot Selection</Label>
                <Button
                  onClick={handleAddSlot}
                  size="sm"
                  className="bg-[#388fe5] hover:bg-[#6fb043]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Slot
                </Button>
              </div>

              <div className="space-y-2">
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#388fe5] transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{slot.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {SLOT_TYPE_LABELS[slot.slot_type]}
                        </Badge>
                        {slot.modality && (
                          <Badge variant="outline" className="text-xs">
                            {MODALITY_LABELS[slot.modality]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)} ({slot.duration} mins)
                      </p>
                    </div>                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSlot(slot)}
                      className="text-gray-600 hover:text-[#388fe5]"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {slots.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No slots configured yet</p>
                    <p className="text-sm">Click "Add Slot" to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button className="flex-1 bg-[#388fe5] hover:bg-[#6fb043]">
                Create Session
              </Button>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Grid Preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader className="bg-[#0B4A6F] text-white">
            <div>
              <h3 className="font-semibold text-lg">
                {sessionName || "Session Preview"} (Remaining time: {remainingTime.hours.toString().padStart(2, '0')}h {remainingTime.minutes.toString().padStart(2, '0')}m)
              </h3>
              <p className="text-sm text-blue-100">
                {sessionType === "on_site" ? "on-site" : "off-site"} ({startTime} - {endTime})
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {distributedSlots.map((timeSlot, idx) => {
                const isSlotStart = idx === 0 ||
                  timeSlot.slotConfig?.id !== distributedSlots[idx - 1]?.slotConfig?.id;

                return (
                  <div
                    key={idx}
                    className={`flex items-center border-b border-gray-200 ${getSlotColor(timeSlot.slotConfig)}`}
                  >
                    <div className="w-16 px-2 py-1 text-xs font-medium text-gray-700 border-r border-gray-200">
                      {timeSlot.time}
                    </div>
                    <div className={`flex-1 px-3 py-1 text-sm ${getSlotTextColor(timeSlot.slotConfig)}`}>
                      {isSlotStart && timeSlot.slotConfig && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          <span className="font-medium">{timeSlot.slotConfig.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slot Configuration Dialog */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Slot Selection
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slot-start">Start Time</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={slotStartTime}
                  onChange={(e) => setSlotStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="slot-end">End Time</Label>
                <Input
                  id="slot-end"
                  type="time"
                  value={slotEndTime}
                  onChange={(e) => setSlotEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="slot-title">Title</Label>
              <Input
                id="slot-title"
                value={slotTitle}
                onChange={(e) => setSlotTitle(e.target.value)}
                placeholder="e.g., Consultation"
              />
            </div>

            {/* Slot Type */}
            <div>
              <Label htmlFor="slot-type">Slot Type</Label>
              <Select value={slotType} onValueChange={(v: any) => setSlotType(v)}>
                <SelectTrigger id="slot-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SLOT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modality (only for clinical) */}
            {slotType === "clinical" && (
              <div>
                <Label htmlFor="modality">Modality</Label>
                <Select value={slotModality} onValueChange={(v: any) => setSlotModality(v)}>
                  <SelectTrigger id="modality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((mod) => (
                      <SelectItem key={mod} value={mod}>
                        {MODALITY_LABELS[mod]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Slot Color */}
            <div>
              <Label htmlFor="slot-color">Slot Color</Label>
              <Input
                id="slot-color"
                type="color"
                value={slotColor}
                onChange={(e) => setSlotColor(e.target.value)}
              />
            </div>

            {/* Label */}
            <div>
              <Label htmlFor="slot-label">Label (Optional)</Label>
              <Input
                id="slot-label"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                placeholder="e.g., New Patient"
              />
            </div>

            {/* Block Slot */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="block-slot"
                checked={slotIsBlocked}
                onCheckedChange={(checked) => setSlotIsBlocked(checked as boolean)}
              />
              <Label htmlFor="block-slot" className="cursor-pointer">
                Block this slot
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveSlot}
              className="w-full bg-[#388fe5] hover:bg-[#6fb043]"
            >
              Set Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

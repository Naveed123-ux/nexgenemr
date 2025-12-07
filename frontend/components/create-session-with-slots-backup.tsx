"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Calendar, Clock, Plus, X, GripVertical, Users, MapPin, Video, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Types
interface SlotConfig {
  id: string;
  type: "Clinical" | "ClinicalAdmin" | "Break";
  modality: "Face to Face" | "Telehealth" | "Phone";
  color?: "red" | "green" | "blue" | "default";
  duration: number; // in minutes
  quantity: number;
  embargoRule?: string;
  blockSlot: boolean;
  label?: string;
}

interface TimeSlot {
  time: string;
  slotConfig: SlotConfig | null;
  index: number;
}

const SLOT_TYPES = ["Clinical", "ClinicalAdmin", "Break"] as const;
const MODALITIES = ["Face to Face", "Telehealth", "Phone"] as const;
const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export default function CreateSessionWithSlots() {
  // Session Details
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState<"on_site" | "off_site">("on_site");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [practiceName, setPracticeName] = useState("");
  const [practiceSite, setPracticeSite] = useState("");
  const [room, setRoom] = useState("");
  const [clinicianName, setClinicianName] = useState("");

  // Slot Configuration
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotConfig | null>(null);

  // Slot Dialog State
  const [slotType, setSlotType] = useState<SlotConfig["type"]>("Clinical");
  const [slotModality, setSlotModality] = useState<SlotConfig["modality"]>("Face to Face");
  const [slotColor, setSlotColor] = useState<SlotConfig["color"]>("default");
  const [slotDuration, setSlotDuration] = useState(15);
  const [slotQuantity, setSlotQuantity] = useState(1);
  const [slotEmbargoRule, setSlotEmbargoRule] = useState("");
  const [slotBlockSlot, setSlotBlockSlot] = useState(false);
  const [slotLabel, setSlotLabel] = useState("");

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
    let currentIndex = 0;

    slots.forEach((slotConfig) => {
      const slotsNeeded = Math.ceil(slotConfig.duration / 5); // Each grid slot is 5 minutes

      for (let i = 0; i < slotConfig.quantity; i++) {
        for (let j = 0; j < slotsNeeded; j++) {
          if (currentIndex + j < distributed.length) {
            distributed[currentIndex + j].slotConfig = slotConfig;
          }
        }
        currentIndex += slotsNeeded;
      }
    });

    return distributed;
  }, [generateTimeSlots, slots]);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    const totalMinutes = distributedSlots.length * 5;
    const usedMinutes = slots.reduce((acc, slot) => acc + (slot.duration * slot.quantity), 0);
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
    setSlotType(slot.type);
    setSlotModality(slot.modality);
    setSlotColor(slot.color || "default");
    setSlotDuration(slot.duration);
    setSlotQuantity(slot.quantity);
    setSlotEmbargoRule(slot.embargoRule || "");
    setSlotBlockSlot(slot.blockSlot);
    setSlotLabel(slot.label || "");
    setSlotDialogOpen(true);
  };

  const handleSaveSlot = () => {
    const newSlot: SlotConfig = {
      id: editingSlot?.id || `slot-${Date.now()}`,
      type: slotType,
      modality: slotModality,
      color: slotColor,
      duration: slotDuration,
      quantity: slotQuantity,
      embargoRule: slotEmbargoRule,
      blockSlot: slotBlockSlot,
      label: slotLabel,
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
    setSlotType("Clinical");
    setSlotModality("Face to Face");
    setSlotColor("default");
    setSlotDuration(15);
    setSlotQuantity(1);
    setSlotEmbargoRule("");
    setSlotBlockSlot(false);
    setSlotLabel("");
  };

  const getSlotColor = (slotConfig: SlotConfig | null) => {
    if (!slotConfig) return "bg-white";

    if (slotConfig.type === "Break") return "bg-red-100";
    if (slotConfig.color === "red") return "bg-red-100";
    if (slotConfig.color === "green") return "bg-green-100";
    if (slotConfig.color === "blue") return "bg-blue-100";

    return "bg-[#388fe5]/20";
  };

  const getSlotTextColor = (slotConfig: SlotConfig | null) => {
    if (!slotConfig) return "text-gray-400";
    if (slotConfig.type === "Break") return "text-red-700";
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

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="session-date">Session Date</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
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

            {/* Practice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="practice-name">Practice Name</Label>
                <Select value={practiceName} onValueChange={setPracticeName}>
                  <SelectTrigger id="practice-name">
                    <SelectValue placeholder="Select practice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="archvale">Archvale Medical Practice</SelectItem>
                    <SelectItem value="central">Central Health Clinic</SelectItem>
                    <SelectItem value="riverside">Riverside Medical Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="practice-site">Practice Site</Label>
                <Select value={practiceSite} onValueChange={setPracticeSite}>
                  <SelectTrigger id="practice-site">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="location1">Archvale Location 1</SelectItem>
                    <SelectItem value="location2">Archvale Location 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="room">Room</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger id="room">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room1">Room 1</SelectItem>
                    <SelectItem value="room2">Room 2</SelectItem>
                    <SelectItem value="room3">Room 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="clinician">Clinician Name</Label>
                <Select value={clinicianName} onValueChange={setClinicianName}>
                  <SelectTrigger id="clinician">
                    <SelectValue placeholder="Select clinician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                    <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                    <SelectItem value="dr-wilson">Dr. Wilson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                Ensure room meets the requirements of the procedure or patient request
              </p>
            </div>

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
                        <span className="font-medium">{slot.type}</span>
                        <Badge variant="outline" className="text-xs">
                          {slot.modality}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {slot.quantity} slot{slot.quantity > 1 ? 's' : ''}, {slot.duration} mins each
                      </p>
                    </div>
                    <Button
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
                {clinicianName || "Clinician Name"} (Remaining time: {remainingTime.hours.toString().padStart(2, '0')}h {remainingTime.minutes.toString().padStart(2, '0')}m)
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
                          <span className="font-medium">{timeSlot.slotConfig.type}</span>
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
            {/* Slot Type */}
            <div>
              <Label>Slot Type</Label>
              <div className="flex gap-3 mt-2">
                {SLOT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="slot-type"
                      checked={slotType === type}
                      onChange={() => setSlotType(type)}
                      className="w-4 h-4 text-[#388fe5] focus:ring-[#388fe5]"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modality */}
            <div>
              <Label htmlFor="modality">Modality for Slot</Label>
              <Select value={slotModality} onValueChange={(v) => setSlotModality(v as any)}>
                <SelectTrigger id="modality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((modality) => (
                    <SelectItem key={modality} value={modality}>
                      {modality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot Color */}
            <div>
              <Label>Slot Color (optional)</Label>
              <div className="flex gap-3 mt-2">
                {[
                  { value: "default", label: "Default", color: "bg-gray-200" },
                  { value: "red", label: "Red", color: "bg-red-200" },
                  { value: "green", label: "Green", color: "bg-green-200" },
                  { value: "blue", label: "Blue", color: "bg-blue-200" },
                ].map((colorOption) => (
                  <label key={colorOption.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="slot-color"
                      checked={slotColor === colorOption.value}
                      onChange={() => setSlotColor(colorOption.value as any)}
                      className="w-4 h-4 text-[#388fe5] focus:ring-[#388fe5]"
                    />
                    <div className={`w-6 h-6 rounded ${colorOption.color} border border-gray-300`} />
                    <span className="text-sm">{colorOption.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Slot Duration */}
            <div>
              <Label htmlFor="duration">Slot Duration</Label>
              <Select value={slotDuration.toString()} onValueChange={(v) => setSlotDuration(Number(v))}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Embargo Rule */}
            <div>
              <Label htmlFor="embargo">Embargo Rule</Label>
              <Select value={slotEmbargoRule} onValueChange={setSlotEmbargoRule}>
                <SelectTrigger id="embargo">
                  <SelectValue placeholder="Select embargo rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="48h">48 hours</SelectItem>
                  <SelectItem value="72h">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Block Slot */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="block-slot"
                checked={slotBlockSlot}
                onCheckedChange={(checked) => setSlotBlockSlot(checked as boolean)}
              />
              <Label htmlFor="block-slot" className="cursor-pointer">
                Block slot
              </Label>
            </div>

            {/* Label */}
            <div>
              <Label htmlFor="label">Label</Label>
              <Textarea
                id="label"
                placeholder="Add any notice here if you want"
                value={slotLabel}
                onChange={(e) => setSlotLabel(e.target.value)}
                rows={3}
              />
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity of Slots</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={slotQuantity}
                onChange={(e) => setSlotQuantity(Number(e.target.value))}
              />
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

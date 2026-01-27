"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Plus, User, Briefcase } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const appointmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  date: z.date(),
  timeSlots: z.array(z.string()).min(1, "At least one time slot is required"),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

export default function SchedulingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2023, 8, 18)); // September 18, 2023
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      name: "",
      role: "",
      date: selectedDate,
      timeSlots: [],
    },
  });

  const timeSlots = [
    "8:30 AM",
    "10:30 AM",
    "12:30 PM",
    "3:30 PM",
    "6:30 PM",
    "8:30 PM",
  ];

  const appointments = [
    {
      id: 1,
      title: "Doctor/Staff Schedule",
      startTime: "09:00",
      endTime: "10:20",
      day: 0,
      color: "bg-blue-500",
    },
    {
      id: 2,
      title: "Doctor/Staff Schedule",
      startTime: "10:30",
      endTime: "11:50",
      day: 1,
      color: "bg-purple-500",
    },
    {
      id: 3,
      title: "Doctor/Staff Schedule",
      startTime: "12:30",
      endTime: "13:50",
      day: 2,
      color: "bg-teal-500",
    },
  ];

  const weekDays = [
    { date: 14, day: "Sun" },
    { date: 15, day: "Mon" },
    { date: 16, day: "Tue" },
    { date: 17, day: "Wed" },
    { date: 18, day: "Thu" },
    { date: 19, day: "Fri" },
    { date: 20, day: "Sat" },
  ];

  const timeHours = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  const toggleTimeSlot = (slot: string) => {
    const newSlots = selectedTimeSlots.includes(slot)
      ? selectedTimeSlots.filter((s) => s !== slot)
      : [...selectedTimeSlots, slot];
    setSelectedTimeSlots(newSlots);
    setValue("timeSlots", newSlots);
  };

  const onSubmit = (data: AppointmentFormData) => {
    console.log("[v0] Appointment form submitted:", data);
    setIsModalOpen(false);
    // Reset form or handle submission
  };

  const getAppointmentStyle = (startTime: string, endTime: string) => {
    const startHour = Number.parseInt(startTime.split(":")[0]);
    const startMinute = Number.parseInt(startTime.split(":")[1]);
    const endHour = Number.parseInt(endTime.split(":")[0]);
    const endMinute = Number.parseInt(endTime.split(":")[1]);

    const startOffset = (startHour - 9) * 60 + startMinute; // Minutes from 9:00
    const endOffset = (endHour - 9) * 60 + endMinute;
    const duration = endOffset - startOffset;

    const top = (startOffset / 60) * 60; // 60px per hour
    const height = (duration / 60) * 60;

    return { top, height };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border border-blue-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Scheduling
              </h2>
              <p className="text-gray-600 mt-1">February, 14-20</p>
            </div>
            <div className="flex items-center gap-4">
              <Select defaultValue="february">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="february">February</SelectItem>
                  <SelectItem value="march">March</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg`-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add new
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-green-primary">
                        NEXGEN
                      </div>
                      <DialogTitle className="text-lg font-semibold">
                        Add New
                      </DialogTitle>
                    </div>
                  </DialogHeader>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="flex gap-8">
                      {/* Left Section - Form Elements */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 border border-gray-300 rounded-full flex items-center justify-center mb-2 bg-gray-50">
                            <Plus className="w-8 h-8 text-blue-500" />
                          </div>
                          <p className="text-sm text-gray-600 font-medium">
                            Upload Image Here
                          </p>
                        </div>

                        {/* Name Field */}
                        <div>
                          <Label
                            htmlFor="name"
                            className="text-sm font-medium text-gray-700"
                          >
                            Name*
                          </Label>
                          <div className="relative mt-1">
                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                              id="name"
                              {...register("name")}
                              placeholder="Enter name"
                              className="pl-10 border-gray-300"
                            />
                          </div>
                          {errors.name && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.name.message}
                            </p>
                          )}
                        </div>

                        {/* Role Field */}
                        <div>
                          <Label
                            htmlFor="role"
                            className="text-sm font-medium text-gray-700"
                          >
                            Role*
                          </Label>
                          <div className="relative mt-1">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <Input
                              id="role"
                              {...register("role")}
                              placeholder="Enter Role"
                              className="pl-10 border-gray-300"
                            />
                          </div>
                          {errors.role && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.role.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="font-medium mb-3 text-gray-900">
                            Monday, 18, September
                          </p>
                          <div className="space-y-1">
                            {timeSlots.map((slot) => (
                              <div
                                key={slot}
                                onClick={() => toggleTimeSlot(slot)}
                                className={`w-full p-3 text-center border rounded cursor-pointer transition-colors ${selectedTimeSlots.includes(slot)
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                                  }`}
                              >
                                {slot}
                              </div>
                            ))}
                          </div>
                          {errors.timeSlots && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.timeSlots.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Calendar and Button */}
                      <div className="flex-1 flex flex-col items-center justify-between">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                              setValue("date", date);
                            }
                          }}
                          className="rounded-md border border-gray-200"
                          defaultMonth={new Date(2023, 8)} // September 2023
                        />

                        <Button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-700 px-6 mt-6"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add new
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Weekly Calendar View */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-8 bg-gray-50">
              <div className="p-3 text-sm font-medium text-gray-600">Week</div>
              {weekDays.map((day, index) => (
                <div key={index} className="p-3 text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {day.date}
                  </div>
                  <div className="text-xs text-gray-500">{day.day}</div>
                </div>
              ))}
            </div>

            <div className="relative">
              {/* Time Slots */}
              {timeHours.map((time, timeIndex) => (
                <div key={time} className="grid grid-cols-8 border-t">
                  <div className="p-3 text-sm text-gray-600 bg-gray-50">
                    {time}
                  </div>
                  {weekDays.map((day, dayIndex) => (
                    <div key={dayIndex} className="border-l min-h-[60px]"></div>
                  ))}
                </div>
              ))}

              {appointments.map((appointment) => {
                const { top, height } = getAppointmentStyle(
                  appointment.startTime,
                  appointment.endTime
                );
                const leftOffset = 12.5 * (appointment.day + 1); // 12.5% per column, starting from column 1

                return (
                  <div
                    key={appointment.id}
                    className={`absolute ${appointment.color} text-white p-2 rounded text-xs mx-1`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftOffset}%`,
                      width: "11.5%", // Slightly less than 12.5% to account for margins
                      zIndex: 10,
                    }}
                  >
                    <div className="font-medium">{appointment.title}</div>
                    <div className="text-xs opacity-90">
                      {appointment.startTime} - {appointment.endTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

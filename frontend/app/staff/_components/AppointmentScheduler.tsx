"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  CalendarX2,
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Your API function
import { fetchAvailableSlots } from "@/app/_apis/staff/receptionist";
import { WaitlistBadge } from "@/components/waitlist/waitlist-badge";
import { TriageInterface } from "@/components/waitlist/triage-interface";
import { WaitlistManagementPanel } from "@/components/waitlist/waitlist-management-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

// --- Type definitions ---
interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  status: "Available" | "Booked" | "Blocked";
  waitlist_match_count?: number;
  has_high_priority_matches?: boolean;
}

export interface SlotWithExtras extends Slot {
  formattedTime: string;
  duration: number;
}

interface AppointmentSchedulerProps {
  selectedDoctor: number | null;
  onSlotSelect: (slotData: SlotWithExtras) => void;
}

// --- Helper functions (no changes) ---
const formatSlotTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Duration in minutes
};

const isSlotAvailable = (status: string): boolean => {
  return status === "Available";
};

// --- Main Component ---
const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  selectedDoctor,
  onSlotSelect,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [triageSlot, setTriageSlot] = useState<SlotWithExtras | null>(null);
  const [showTriage, setShowTriage] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  useEffect(() => {
    const loadSlots = async (): Promise<void> => {
      if (!selectedDoctor) {
        setAllSlots([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const slots = await fetchAvailableSlots(selectedDoctor, dateStr);
        setAllSlots(slots || []);
      } catch (error) {
        console.error("Error fetching slots:", error);
        setAllSlots([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [currentDate, selectedDoctor]);

  const goToPreviousDay = (): void => {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setCurrentDate(previousDay);
  };

  const goToNextDay = (): void => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setIsCalendarOpen(false); // Close the popover on date selection
    }
  };

  const handleSlotClick = (slot: Slot): void => {
    if (isSlotAvailable(slot.status)) {
      onSlotSelect({
        ...slot,
        formattedTime: formatSlotTime(slot.start_time),
        duration: calculateDuration(slot.start_time, slot.end_time),
      });
    }
  };

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous day</span>
          </Button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className=" justify-center text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(currentDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next day</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <SlotSkeleton />
        ) : allSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allSlots.map((slot) => {
              const isAvailable = isSlotAvailable(slot.status);
              return (
                <div key={slot.id} className="relative">
                  <Button
                    variant={isAvailable ? "outline" : "secondary"}
                    disabled={!isAvailable}
                    onClick={() => handleSlotClick(slot)}
                    className={`
                      w-full h-auto py-3 px-2 flex flex-col items-center justify-center gap-1
                      ${isAvailable
                        ? "border-green-300 bg-white text-green-800 hover:bg-green-50 hover:opacity-80-900"
                        : ""
                      }
                    `}
                  >
                    <span className="font-semibold text-base">
                      {formatSlotTime(slot.start_time)}
                    </span>
                    {isAvailable ? (
                      <span className="text-xs text-green-700 font-medium">
                        Available
                      </span>
                    ) : (
                      <Badge variant={"destructive"} className="text-xs">
                        {slot.status}
                      </Badge>
                    )}
                  </Button>
                  {isAvailable && (
                    <div
                      className="absolute -top-2 -right-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WaitlistBadge
                        matchCount={slot.waitlist_match_count || 0}
                        hasHighPriority={slot.has_high_priority_matches || false}
                        onClick={() => {
                          setTriageSlot({
                            ...slot,
                            formattedTime: formatSlotTime(slot.start_time),
                            duration: calculateDuration(slot.start_time, slot.end_time),
                          });
                          setShowTriage(true);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <NotAvailableMessage onAddToWaitlist={() => setShowWaitlistModal(true)} />
        )}
      </CardContent>

      <CardFooter>
        <p className="text-sm text-muted-foreground mx-auto">
          {selectedDoctor
            ? "Select an available time slot."
            : "Please select a doctor first."}
        </p>
      </CardFooter>

      {/* Triage Interface */}
      {triageSlot && (
        <TriageInterface
          isOpen={showTriage}
          onClose={() => {
            setShowTriage(false);
            setTriageSlot(null);
          }}
          slotId={triageSlot.id}
          slotStartTime={triageSlot.start_time}
          slotEndTime={triageSlot.end_time}
          onBookingComplete={() => {
            setShowTriage(false);
            setTriageSlot(null);
            // Refresh slots to show updated availability
            if (selectedDoctor) {
              const dateStr = format(currentDate, "yyyy-MM-dd");
              fetchAvailableSlots(selectedDoctor, dateStr).then(slots => {
                setAllSlots(slots || []);
              });
            }
          }}
        />
      )}

      {/* Waitlist Modal for No Slots Available */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Patient to Waitlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="font-medium text-blue-900">No slots available on this date</p>
              <p className="text-blue-700 mt-1">
                Add a patient to the waitlist for this doctor and they'll be notified when a slot becomes available.
              </p>
            </div>
            <WaitlistManagementPanel doctorId={selectedDoctor || undefined} />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// --- Helper Sub-components for better readability ---

const SlotSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton key={index} className="h-16 w-full rounded-md" />
    ))}
  </div>
);

const NotAvailableMessage = ({ onAddToWaitlist }: { onAddToWaitlist?: () => void }) => (
  <div className="flex flex-col items-center justify-center text-center py-10">
    <CalendarX2 className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold">Not Available</h3>
    <p className="text-muted-foreground mb-4">
      No appointments are available on this day.
    </p>
    {onAddToWaitlist && (
      <Button
        onClick={onAddToWaitlist}
        variant="outline"
        className="mt-2"
      >
        Add Patient to Waitlist
      </Button>
    )}
  </div>
);

export default AppointmentScheduler;
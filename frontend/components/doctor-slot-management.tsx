"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/store";
import {
  fetchMyAvailableSlots,
  blockAppointmentSlot,
  unblockAppointmentSlot,
} from "@/store/slices/sessionsSlice";
import type { SlotResponse } from "@/lib/session-api-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WaitlistBadge } from "@/components/waitlist/waitlist-badge";

/**
 * Component for doctors to manage their available slots
 * - View all available slots
 * - Block/unblock slots
 * - Filter by date, type, and modality
 */
export default function DoctorSlotManagement() {
  const dispatch = useAppDispatch();
  const {
    doctorAvailableSlots,
    doctorAvailableSlotsStatus,
    doctorAvailableSlotsError,
  } = useAppSelector((state: RootState) => state.sessions);

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterModality, setFilterModality] = useState<string>("all");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [processingSlots, setProcessingSlots] = useState<Set<number>>(
    new Set()
  );

  // Fetch slots when filters change
  useEffect(() => {
    dispatch(
      fetchMyAvailableSlots({
        startDate,
        endDate: endDate || undefined,
        onlyAvailable: showOnlyAvailable,
      })
    );
  }, [dispatch, startDate, endDate, showOnlyAvailable]);

  // Filter slots based on selected filters
  const filteredSlots = doctorAvailableSlots.filter((slot: SlotResponse) => {
    if (filterType !== "all" && slot.slot_type !== filterType) return false;
    if (filterModality !== "all" && slot.modality !== filterModality)
      return false;
    return true;
  });

  // Group slots by date
  const slotsByDate = filteredSlots.reduce((acc: Record<string, SlotResponse[]>, slot: SlotResponse) => {
    const date = new Date(slot.start_time).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, SlotResponse[]>);

  // Sort dates
  const sortedDates = Object.keys(slotsByDate).sort();

  // Handle block slot
  const handleBlockSlot = async (slotId: number) => {
    setProcessingSlots((prev) => new Set([...prev, slotId]));

    try {
      const result = await dispatch(blockAppointmentSlot(slotId));

      if (blockAppointmentSlot.fulfilled.match(result)) {
        toast.success("Slot blocked successfully");
      } else {
        toast.error("Failed to block slot");
      }
    } catch (error) {
      toast.error("An error occurred while blocking the slot");
    } finally {
      setProcessingSlots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slotId);
        return newSet;
      });
    }
  };

  // Handle unblock slot
  const handleUnblockSlot = async (slotId: number) => {
    setProcessingSlots((prev) => new Set([...prev, slotId]));

    try {
      const result = await dispatch(unblockAppointmentSlot(slotId));

      if (unblockAppointmentSlot.fulfilled.match(result)) {
        toast.success("Slot unblocked successfully");
      } else {
        toast.error("Failed to unblock slot");
      }
    } catch (error) {
      toast.error("An error occurred while unblocking the slot");
    } finally {
      setProcessingSlots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slotId);
        return newSet;
      });
    }
  };

  // Format slot time
  const formatSlotTime = (slot: SlotResponse) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return {
      time: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
      duration: `${slot.duration} min`,
    };
  };

  // Get slot status badge
  const getStatusBadge = (slot: SlotResponse) => {
    if (slot.is_booked) {
      return (
        <Badge className="bg-blue-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Booked
        </Badge>
      );
    }
    if (slot.is_blocked) {
      return (
        <Badge variant="destructive">
          <Lock className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Available
      </Badge>
    );
  };

  // Get modality label
  const getModalityLabel = (modality: string | null) => {
    switch (modality) {
      case "face_to_face":
        return "In-Person";
      case "telephone":
        return "Phone";
      case "home_visit":
        return "Home Visit";
      default:
        return "N/A";
    }
  };

  // Get slot type label
  const getSlotTypeLabel = (type: string) => {
    switch (type) {
      case "clinical":
        return "Clinical";
      case "clinicalAdmin":
        return "Admin";
      case "break":
        return "Break";
      case "unallocated":
        return "Unallocated";
      default:
        return type;
    }
  };

  // Calculate statistics
  const stats = {
    total: filteredSlots.length,
    available: filteredSlots.filter((s: SlotResponse) => !s.is_blocked && !s.is_booked)
      .length,
    blocked: filteredSlots.filter((s: SlotResponse) => s.is_blocked).length,
    booked: filteredSlots.filter((s: SlotResponse) => s.is_booked).length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Manage My Availability</h2>
        <p className="text-gray-600">
          View and manage your appointment slots - block or unblock time slots
          as needed
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Slot Type
              </label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="clinicalAdmin">Admin</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                  <SelectItem value="unallocated">Unallocated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Modality
              </label>
              <Select
                value={filterModality}
                onValueChange={setFilterModality}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modalities</SelectItem>
                  <SelectItem value="face_to_face">In-Person</SelectItem>
                  <SelectItem value="telephone">Phone</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyAvailable"
              checked={showOnlyAvailable}
              onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showOnlyAvailable" className="text-sm">
              Show only available slots (exclude blocked and booked)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Slots</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#388fe5]">
              {stats.available}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {stats.blocked}
            </div>
            <div className="text-sm text-gray-600">Blocked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.booked}
            </div>
            <div className="text-sm text-gray-600">Booked</div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {doctorAvailableSlotsStatus === "loading" && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#388fe5]" />
        </div>
      )}

      {/* Error State */}
      {doctorAvailableSlotsStatus === "failed" && doctorAvailableSlotsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{doctorAvailableSlotsError.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Slots by Date */}
      {doctorAvailableSlotsStatus === "succeeded" && (
        <>
          {filteredSlots.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No slots found matching your filters</p>
                <p className="text-sm mt-2">
                  Try adjusting your filters or date range
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {format(new Date(date), "EEEE, MMMM dd, yyyy")}
                      <Badge variant="outline" className="ml-2">
                        {slotsByDate[date].length} slots
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {slotsByDate[date].map((slot: SlotResponse) => {
                        const { time, duration } = formatSlotTime(slot);
                        const isProcessing = processingSlots.has(slot.id);

                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{time}</span>
                                {getStatusBadge(slot)}
                                <Badge variant="outline" className="text-xs">
                                  {duration}
                                </Badge>
                                {!slot.is_booked && !slot.is_blocked && (
                                  <WaitlistBadge
                                    matchCount={slot.waitlist_match_count || 0}
                                    hasHighPriority={slot.has_high_priority_matches || false}
                                    onClick={() => {
                                      // TODO: Open triage interface (Task 12)
                                      toast.success(`Opening triage for slot ${slot.id}`);
                                    }}
                                  />
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>
                                  Type: {getSlotTypeLabel(slot.slot_type)}
                                </span>
                                <span>
                                  Modality: {getModalityLabel(slot.modality)}
                                </span>
                                {slot.title && <span>Title: {slot.title}</span>}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {!slot.is_booked && (
                                <>
                                  {slot.is_blocked ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUnblockSlot(slot.id)}
                                      disabled={isProcessing}
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Unlock className="h-4 w-4 mr-1" />
                                          Unblock
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleBlockSlot(slot.id)}
                                      disabled={isProcessing}
                                    >
                                      {isProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <Lock className="h-4 w-4 mr-1" />
                                          Block
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </>
                              )}
                              {slot.is_booked && (
                                <Badge variant="secondary">
                                  Cannot modify booked slot
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

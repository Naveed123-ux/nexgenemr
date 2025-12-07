"use client";

import React, { useMemo, useState } from "react";
import { Clock, Users, ClipboardList, Coffee, Square, AlertTriangle } from "lucide-react";
import { SlotConfig, timeToMinutes, minutesToTime, slotsOverlap } from "@/lib/session-validation";
import { DaySchedulerProps } from "@/lib/session-api-types";

// Props interface is now imported from session-api-types

interface TimeSlot {
  time: string;
  minutes: number;
  isEmpty: boolean;
  conflictCount: number;
}

const DayScheduler: React.FC<DaySchedulerProps> = ({
  sessionName,
  sessionType,
  startTime,
  endTime,
  slots,
  onSlotClick,
  onSlotRemove,
  onTimeSlotClick,
  onSlotEdit,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Memoized calculations for performance
  const timeSlots = useMemo((): TimeSlot[] => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const timeSlots: TimeSlot[] = [];

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
      const time = minutesToTime(minutes);

      // Check if this time slot is occupied by any slots
      const occupyingSlots = slots.filter(slot => {
        const slotStart = timeToMinutes(slot.start_time);
        const slotEnd = timeToMinutes(slot.end_time);
        return minutes >= slotStart && minutes < slotEnd;
      });

      timeSlots.push({
        time,
        minutes,
        isEmpty: occupyingSlots.length === 0,
        conflictCount: occupyingSlots.length > 1 ? occupyingSlots.length : 0,
      });
    }

    return timeSlots;
  }, [startTime, endTime, slots]);

  // Calculate remaining time and conflicts
  const { remainingMinutes, totalConflicts, conflictedSlots } = useMemo(() => {
    const totalDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
    const allocatedMinutes = slots.reduce((sum, slot) => sum + slot.duration, 0);
    const remaining = totalDuration - allocatedMinutes;

    // Find conflicted slots
    const conflicts = new Set<string>();
    let totalConflictCount = 0;

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slotsOverlap(slots[i], slots[j])) {
          conflicts.add(slots[i].id || '');
          conflicts.add(slots[j].id || '');
          totalConflictCount++;
        }
      }
    }

    return {
      remainingMinutes: remaining,
      totalConflicts: totalConflictCount,
      conflictedSlots: conflicts,
    };
  }, [slots, startTime, endTime]);

  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // Get slot icon based on type
  const getSlotIcon = (slotType: string) => {
    switch (slotType) {
      case "clinical":
        return <Users className="h-3 w-3" />;
      case "clinicalAdmin":
        return <ClipboardList className="h-3 w-3" />;
      case "break":
        return <Coffee className="h-3 w-3" />;
      case "unallocated":
        return <Square className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Get slot color based on type
  const getSlotColor = (slotType: string, customColor?: string) => {
    if (customColor) return customColor;

    switch (slotType) {
      case "clinical":
        return "#4CAF50"; // Green
      case "clinicalAdmin":
        return "#FF9800"; // Orange
      case "break":
        return "#9C27B0"; // Purple
      case "unallocated":
        return "#E0E0E0"; // Light Gray
      default:
        return "#2196F3"; // Blue
    }
  };

  // Enhanced slot styling with real-time updates
  const getSlotStyle = (slot: SlotConfig) => {
    const slotStartMinutes = timeToMinutes(slot.start_time);
    const sessionStartMinutes = timeToMinutes(startTime);
    const sessionDuration = timeToMinutes(endTime) - sessionStartMinutes;

    // Dynamic scaling based on session duration
    const pixelsPerMinute = Math.max(1, Math.min(4, 600 / sessionDuration));
    const top = (slotStartMinutes - sessionStartMinutes) * pixelsPerMinute;
    const height = slot.duration * pixelsPerMinute;

    // Enhanced conflict detection
    const hasConflict = conflictedSlots.has(slot.id || '');
    const isHovered = hoveredSlot === slot.id;
    const isSelected = selectedSlot === slot.id;

    let backgroundColor = getSlotColor(slot.slot_type, slot.slot_color);
    let borderColor = 'transparent';
    let borderWidth = '1px';
    let opacity = 1;
    let zIndex = 1;

    if (hasConflict) {
      backgroundColor = '#ff4444';
      borderColor = '#cc0000';
      borderWidth = '2px';
      opacity = 0.9;
      zIndex = 3;
    }

    if (isHovered) {
      opacity = 0.8;
      borderColor = '#2563eb';
      borderWidth = '2px';
      zIndex = 4;
    }

    if (isSelected) {
      borderColor = '#1d4ed8';
      borderWidth = '3px';
      zIndex = 5;
    }

    return {
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height for visibility
      backgroundColor,
      border: `${borderWidth} solid ${borderColor}`,
      opacity,
      zIndex,
      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      transition: 'all 0.2s ease-in-out',
    };
  };

  // Calculate timeline scale dynamically
  const getTimelineHeight = () => {
    const sessionDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
    const pixelsPerMinute = Math.max(1, Math.min(4, 600 / sessionDuration));
    return Math.max(600, sessionDuration * pixelsPerMinute);
  };

  // Handle slot interactions
  const handleSlotClick = (slot: SlotConfig, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedSlot(slot.id || null);
    onSlotClick?.(slot);
  };

  const handleSlotDoubleClick = (slot: SlotConfig, event: React.MouseEvent) => {
    event.stopPropagation();
    onSlotEdit?.(slot);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Enhanced Header with Real-time Stats */}
      <div className="bg-[#388fe5] text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {sessionName}
              {totalConflicts > 0 && (
                <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  {totalConflicts} conflict{totalConflicts > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-4 text-sm text-green-100 mt-1">
              <span>
                {sessionType === "on_site" ? "On-site" : "Off-site"} ({startTime}-{endTime})
              </span>
              <span>
                Remaining: {remainingHours}h {remainingMins.toString().padStart(2, "0")}m
              </span>
              <span>
                Slots: {slots.length}
              </span>
            </div>
          </div>
          {selectedSlot && (
            <div className="text-right">
              <p className="text-xs text-green-100">Selected Slot</p>
              <p className="text-sm font-medium">
                {slots.find(s => s.id === selectedSlot)?.title || 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Scheduler Grid with Dynamic Scaling */}
      <div
        className="relative h-[600px] overflow-y-auto border-t border-gray-200"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
        onClick={() => setSelectedSlot(null)}
      >
        {/* Scroll Indicator */}
        {getTimelineHeight() > 600 && (
          <div className="absolute top-2 right-2 z-20 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-75">
            Scroll to view more
          </div>
        )}

        {/* Enhanced Time Column with Conflict Indicators */}
        <div
          className="sticky left-0 top-0 w-16 bg-gray-50 border-r border-gray-200 z-10 float-left relative"
          style={{ minHeight: `${getTimelineHeight()}px` }}
        >
          {timeSlots.map((timeSlot, index) => {
            const sessionDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
            const pixelsPerMinute = Math.max(1, Math.min(4, 600 / sessionDuration));
            const slotHeight = 15 * pixelsPerMinute;
            const topPosition = index * slotHeight;

            return (
              <div key={index}>
                {/* Clickable area for the time slot */}
                <div
                  className={`absolute w-full ${timeSlot.conflictCount > 0
                      ? 'bg-red-50'
                      : timeSlot.isEmpty
                        ? 'hover:bg-blue-50 cursor-pointer'
                        : 'bg-gray-100'
                    }`}
                  style={{
                    top: `${topPosition}px`,
                    height: `${Math.max(slotHeight, 40)}px`
                  }}
                  onClick={(e) => {
                    if (timeSlot.isEmpty && onTimeSlotClick) {
                      e.stopPropagation();
                      onTimeSlotClick(timeSlot.time);
                    }
                  }}
                  title={
                    timeSlot.conflictCount > 0
                      ? `${timeSlot.conflictCount} overlapping slots`
                      : timeSlot.isEmpty
                        ? `Click to add slot at ${timeSlot.time}`
                        : `Occupied at ${timeSlot.time}`
                  }
                />

                {/* Time label positioned exactly at the grid line */}
                <div
                  className={`absolute w-full flex items-start justify-center text-xs font-mono px-1 pointer-events-none ${timeSlot.conflictCount > 0
                      ? 'text-red-700'
                      : timeSlot.isEmpty
                        ? 'text-gray-600'
                        : 'text-gray-500'
                    }`}
                  style={{
                    top: `${topPosition}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <span className="text-center leading-tight bg-gray-50 px-1">{timeSlot.time}</span>
                </div>

                {timeSlot.conflictCount > 0 && (
                  <div className="absolute right-1 top-1 pointer-events-none" style={{ top: `${topPosition + 4}px` }}>
                    <AlertTriangle className="h-2 w-2 text-red-500" />
                  </div>
                )}

                {/* Border line at the bottom of each slot */}
                <div
                  className="absolute w-full border-b border-gray-100"
                  style={{
                    top: `${topPosition + Math.max(slotHeight, 40)}px`,
                    height: "1px",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Enhanced Slots Area with Dynamic Scaling */}
        <div
          className="ml-16 relative"
          style={{ minHeight: `${getTimelineHeight()}px` }}
        >
          {/* Enhanced Grid Lines with Conflict Highlighting */}
          {timeSlots.map((timeSlot, index) => {
            const sessionDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
            const pixelsPerMinute = Math.max(1, Math.min(4, 600 / sessionDuration));
            const slotHeight = 15 * pixelsPerMinute;
            const topPosition = index * slotHeight;

            return (
              <div key={index}>
                <div
                  className={`absolute w-full border-b ${timeSlot.conflictCount > 0
                      ? 'border-red-200'
                      : 'border-gray-100'
                    }`}
                  style={{
                    top: `${topPosition}px`,
                    height: "1px",
                  }}
                />
                {onTimeSlotClick && timeSlot.isEmpty && (
                  <div
                    className="absolute w-full hover:bg-blue-50 cursor-pointer transition-colors group"
                    style={{
                      top: `${topPosition}px`,
                      height: `${Math.max(slotHeight, 40)}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTimeSlotClick(timeSlot.time);
                    }}
                    title={`Click to add slot at ${timeSlot.time}`}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">
                      <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
                        + Add slot
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Enhanced Rendered Slots with Interactive Features */}
          {slots.map((slot) => {
            const hasConflict = conflictedSlots.has(slot.id || '');
            const isHovered = hoveredSlot === slot.id;
            const isSelected = selectedSlot === slot.id;

            return (
              <div
                key={slot.id}
                className={`absolute left-0 right-0 mx-1 rounded text-white text-xs font-medium shadow-sm cursor-pointer group ${hasConflict ? 'animate-pulse' : ''
                  }`}
                style={getSlotStyle(slot)}
                onClick={(e) => handleSlotClick(slot, e)}
                onDoubleClick={(e) => handleSlotDoubleClick(slot, e)}
                onMouseEnter={() => setHoveredSlot(slot.id || null)}
                onMouseLeave={() => setHoveredSlot(null)}
                title={`${slot.title} (${slot.start_time}-${slot.end_time})${hasConflict ? ' - CONFLICT!' : ''}${isSelected ? ' - Selected' : ''}`}
              >
                <div className="flex items-center justify-between w-full px-2 py-1 h-full">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {getSlotIcon(slot.slot_type)}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate font-medium">{slot.title}</span>
                      <span className="text-xs opacity-75">
                        {slot.start_time}-{slot.end_time} ({slot.duration}m)
                      </span>
                      {slot.modality && (
                        <span className="text-xs opacity-75 capitalize">
                          {slot.modality.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {hasConflict && (
                      <AlertTriangle className="h-3 w-3 text-yellow-300" />
                    )}
                    {onSlotRemove && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotRemove(slot.id!);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 rounded p-0.5"
                        title="Remove slot"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Slot Details Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 min-w-48">
                    <div className="font-medium">{slot.title}</div>
                    <div className="text-gray-300 mt-1">
                      <div>Time: {slot.start_time} - {slot.end_time}</div>
                      <div>Duration: {slot.duration} minutes</div>
                      <div>Type: {slot.slot_type}</div>
                      {slot.modality && <div>Modality: {slot.modality.replace('_', ' ')}</div>}
                      {slot.label && <div>Label: {slot.label}</div>}
                      {hasConflict && <div className="text-red-300 font-medium">⚠ Overlaps with other slots</div>}
                    </div>
                    <div className="text-gray-400 text-xs mt-2">
                      Click to select • Double-click to edit
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Enhanced Empty State with Interactive Guidance */}
          {slots.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No slots configured</p>
                <p className="text-xs">Click on any time slot to add your first slot</p>
                {onTimeSlotClick && (
                  <div className="mt-2 text-xs text-blue-500">
                    💡 Tip: Click on time labels to quickly create slots
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Slot Management Panel */}
          {selectedSlot && (
            <div className="absolute right-2 top-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-30 min-w-48">
              {(() => {
                const slot = slots.find(s => s.id === selectedSlot);
                if (!slot) return null;

                const hasConflict = conflictedSlots.has(slot.id || '');

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900">Slot Details</h4>
                      <button
                        onClick={() => setSelectedSlot(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>
                        <span className="ml-1 text-gray-900">{slot.title}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Time:</span>
                        <span className="ml-1 text-gray-900">{slot.start_time} - {slot.end_time}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Duration:</span>
                        <span className="ml-1 text-gray-900">{slot.duration} minutes</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <span className="ml-1 text-gray-900 capitalize">{slot.slot_type}</span>
                      </div>
                      {slot.modality && (
                        <div>
                          <span className="font-medium text-gray-700">Modality:</span>
                          <span className="ml-1 text-gray-900 capitalize">{slot.modality.replace('_', ' ')}</span>
                        </div>
                      )}
                      {slot.label && (
                        <div>
                          <span className="font-medium text-gray-700">Label:</span>
                          <span className="ml-1 text-gray-900">{slot.label}</span>
                        </div>
                      )}
                      {hasConflict && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                          <div className="flex items-center gap-1 text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium text-xs">Conflict Detected</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            This slot overlaps with other slots. Please adjust the timing.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                      {onSlotEdit && (
                        <button
                          onClick={() => {
                            onSlotEdit(slot);
                            setSelectedSlot(null);
                          }}
                          className="flex-1 bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {onSlotRemove && (
                        <button
                          onClick={() => {
                            onSlotRemove(slot.id!);
                            setSelectedSlot(null);
                          }}
                          className="flex-1 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Status Bar */}
      {(totalConflicts > 0 || selectedSlot || hoveredSlot) && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {totalConflicts > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{totalConflicts} conflict{totalConflicts > 1 ? 's' : ''} detected</span>
                </div>
              )}
              {selectedSlot && (
                <div className="text-blue-600">
                  Selected: {slots.find(s => s.id === selectedSlot)?.title}
                </div>
              )}
              {hoveredSlot && !selectedSlot && (
                <div className="text-gray-600">
                  Hovering: {slots.find(s => s.id === hoveredSlot)?.title}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>💡 Click to select</span>
              <span>•</span>
              <span>Double-click to edit</span>
              <span>•</span>
              <span>Click empty time to add</span>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default DayScheduler;

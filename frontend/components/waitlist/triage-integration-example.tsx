/**
 * Example: How to integrate TriageInterface with WaitlistBadge
 * 
 * This example shows how to use the WaitlistBadge and TriageInterface together
 * in a calendar or schedule view.
 */

"use client";

import { useState } from "react";
import { WaitlistBadge } from "./waitlist-badge";
import { TriageInterface } from "./triage-interface";

interface SlotWithWaitlist {
  id: number;
  start_time: string;
  end_time: string;
  waitlist_match_count: number;
  has_high_priority_matches: boolean;
}

export function TriageIntegrationExample() {
  const [triageOpen, setTriageOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithWaitlist | null>(null);

  // Example slot data (this would come from your API)
  const exampleSlot: SlotWithWaitlist = {
    id: 123,
    start_time: "2025-11-30T10:00:00",
    end_time: "2025-11-30T10:30:00",
    waitlist_match_count: 3,
    has_high_priority_matches: true
  };

  const handleBadgeClick = (slot: SlotWithWaitlist) => {
    setSelectedSlot(slot);
    setTriageOpen(true);
  };

  const handleTriageClose = () => {
    setTriageOpen(false);
    setSelectedSlot(null);
  };

  const handleBookingComplete = () => {
    // Refresh your calendar/schedule data here
    console.log("Booking completed, refresh calendar");
  };

  return (
    <div className="p-4">
      {/* Example: Render badge on an empty slot */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">10:00 AM - 10:30 AM</span>
          <WaitlistBadge
            matchCount={exampleSlot.waitlist_match_count}
            hasHighPriority={exampleSlot.has_high_priority_matches}
            onClick={() => handleBadgeClick(exampleSlot)}
          />
        </div>
      </div>

      {/* Triage Interface */}
      {selectedSlot && (
        <TriageInterface
          isOpen={triageOpen}
          onClose={handleTriageClose}
          slotId={selectedSlot.id}
          slotStartTime={selectedSlot.start_time}
          slotEndTime={selectedSlot.end_time}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  );
}

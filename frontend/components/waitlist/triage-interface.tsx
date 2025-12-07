"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle,
  UserCheck,
  Send,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { privateApi } from "@/lib/axios";
import { format, differenceInDays } from "date-fns";

interface TriageInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: number;
  slotStartTime: string;
  slotEndTime: string;
  onBookingComplete?: () => void;
}

interface WaitlistMatch {
  entry_id: number;
  patient_name: string;
  patient_phone: string | null;
  patient_email?: string | null;
  priority: "normal" | "high";
  notes: string | null;
  created_at: string;
  days_waiting: number;
  preferred_days: string[];
  patient_profile_id?: number;
}

interface TriageData {
  slot_id: number;
  slot_start_time: string;
  slot_end_time: string;
  doctor_name: string;
  doctor_user_id: number;
  match_count: number;
  matches: WaitlistMatch[];
}

export function TriageInterface({
  isOpen,
  onClose,
  slotId,
  slotStartTime,
  slotEndTime,
  onBookingComplete
}: TriageInterfaceProps) {
  const [triageData, setTriageData] = useState<TriageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && slotId) {
      loadTriageData();
    }
  }, [isOpen, slotId]);

  const loadTriageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await privateApi.get(`/api/waitlist/slots/${slotId}/matches`);
      setTriageData(response.data);
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to load waitlist matches";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (entryId: number) => {
    setActionLoading(entryId);
    try {
      const response = await privateApi.post(`/api/waitlist/entries/${entryId}/invite`, {
        appointment_slot_id: slotId
      });
      
      toast.success("Invitation sent successfully!");
      
      // Refresh the triage data
      await loadTriageData();
      
      // Notify parent component
      if (onBookingComplete) {
        onBookingComplete();
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to send invitation";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallAndBook = async (match: WaitlistMatch) => {
    // Close the triage interface and trigger the standard booking flow
    // This will be handled by passing the patient info back to the parent
    setActionLoading(match.entry_id);
    try {
      // Book directly via the waitlist endpoint
      const response = await privateApi.post(`/api/waitlist/entries/${match.entry_id}/book`, {
        appointment_slot_id: slotId,
        is_telehealth: false,
        reason_for_visit: match.notes || "Waitlist booking"
      });
      
      toast.success(`Appointment booked for ${match.patient_name}!`);
      
      // Close the interface
      onClose();
      
      // Notify parent component to refresh
      if (onBookingComplete) {
        onBookingComplete();
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to book appointment";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    return priority === "high" 
      ? "bg-red-100 text-red-800 border-red-300" 
      : "bg-gray-100 text-gray-800 border-gray-300";
  };

  const formatDaysWaiting = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Waitlist Triage</SheetTitle>
          <SheetDescription>
            Review and contact patients waiting for this time slot
          </SheetDescription>
        </SheetHeader>

        {/* Slot Information */}
        <Card className="p-4 mt-4 bg-blue-50 border-blue-200">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium">
                {format(new Date(slotStartTime), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>
                {format(new Date(slotStartTime), "h:mm a")} - {format(new Date(slotEndTime), "h:mm a")}
              </span>
            </div>
            {triageData && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>{triageData.doctor_name}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-6 mt-4 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error Loading Matches</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTriageData}
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* No Matches State */}
        {!loading && !error && triageData && triageData.match_count === 0 && (
          <Card className="p-8 mt-4 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No Matching Patients</p>
            <p className="text-sm text-gray-500 mt-1">
              There are no patients on the waitlist for this time slot.
            </p>
          </Card>
        )}

        {/* Matches List */}
        {!loading && !error && triageData && triageData.match_count > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {triageData.match_count} {triageData.match_count === 1 ? "Match" : "Matches"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTriageData}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              {triageData.matches.map((match, index) => (
                <Card key={match.entry_id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {/* Header with name and badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{match.patient_name}</h4>
                          <Badge className={getPriorityBadgeColor(match.priority)}>
                            {match.priority === "high" ? "High Priority" : "Normal"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Waiting {formatDaysWaiting(match.days_waiting)}
                          </Badge>
                        </div>
                      </div>
                      {index === 0 && (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Top Match
                        </Badge>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-1.5 text-sm">
                      {match.patient_phone && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <a 
                            href={`tel:${match.patient_phone}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {match.patient_phone}
                          </a>
                        </div>
                      )}
                      {match.patient_email && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <a 
                            href={`mailto:${match.patient_email}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {match.patient_email}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>Prefers: {match.preferred_days.join(", ")}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {match.notes && (
                      <div className="bg-gray-50 rounded-md p-3 text-sm">
                        <p className="text-gray-700">
                          <span className="font-medium">Notes:</span> {match.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleCallAndBook(match)}
                        disabled={actionLoading !== null}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === match.entry_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4 mr-2" />
                            Call & Book
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSendInvite(match.entry_id)}
                        disabled={actionLoading !== null}
                        className="flex-1"
                      >
                        {actionLoading === match.entry_id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Invite
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

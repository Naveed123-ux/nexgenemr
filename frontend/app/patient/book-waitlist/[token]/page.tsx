"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, MapPin, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import publicApi from "@/lib/axios";

interface BookingDetails {
  valid: boolean;
  slot_available: boolean;
  patient_name?: string;
  doctor_name?: string;
  appointment_time?: string;
  appointment_end_time?: string;
  is_telehealth?: boolean;
  hospital_name?: string;
  error_message?: string;
}

export default function BookWaitlistAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (token) {
      fetchBookingDetails();
    }
  }, [token]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const response = await publicApi.get(`/api/waitlist/book/${token}`);
      setBookingDetails(response.data);
    } catch (error: any) {
      toast.error("Failed to load booking details");
      setBookingDetails({
        valid: false,
        slot_available: false,
        error_message: "Failed to load booking details"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAppointment = async () => {
    if (!reasonForVisit.trim()) {
      toast.error("Please provide a reason for your visit");
      return;
    }

    setBooking(true);
    try {
      await publicApi.post(`/api/waitlist/book/${token}/claim`, {
        reason_for_visit: reasonForVisit
      });

      setBooked(true);
      toast.success("Appointment booked successfully!");
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to book appointment";
      toast.error(message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading booking details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bookingDetails?.valid || !bookingDetails?.slot_available) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-red-200">
          <CardHeader className="bg-red-50">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <CardTitle className="text-red-900">Booking Unavailable</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4">
              {bookingDetails?.error_message || "This booking link is no longer valid."}
            </p>
            <p className="text-sm text-gray-600">
              This could be because:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>The appointment slot has already been booked</li>
              <li>The invitation has expired</li>
              <li>The link has already been used</li>
              <li>The link is invalid</li>
            </ul>
            <div className="mt-6">
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-green-200">
          <CardHeader className="bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-[#388fe5]" />
              <CardTitle className="text-green-900">Appointment Confirmed!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-white rounded-lg p-4 border space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Doctor</p>
                  <p className="font-semibold">{bookingDetails.doctor_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-semibold">
                    {bookingDetails.appointment_time &&
                      format(new Date(bookingDetails.appointment_time), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {bookingDetails.is_telehealth ? (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">Telehealth (Virtual)</p>
                  </div>
                </div>
              ) : bookingDetails.hospital_name && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold">{bookingDetails.hospital_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">What's Next?</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You will receive a confirmation email shortly</li>
                <li>• Please arrive 10 minutes before your appointment</li>
                <li>• Bring your insurance card and ID</li>
                {bookingDetails.is_telehealth && (
                  <li>• You will receive a video call link before your appointment</li>
                )}
              </ul>
            </div>

            <Button
              onClick={() => router.push("/")}
              className="w-full"
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-900">Confirm Your Appointment</CardTitle>
          <p className="text-sm text-blue-700 mt-2">
            You've been invited to book this appointment from the waitlist
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Doctor</p>
                <p className="font-medium">{bookingDetails.doctor_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium">
                  {bookingDetails.appointment_time &&
                    format(new Date(bookingDetails.appointment_time), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="font-medium">
                  {bookingDetails.appointment_time && bookingDetails.appointment_end_time &&
                    `${format(new Date(bookingDetails.appointment_time), "h:mm a")} - ${format(new Date(bookingDetails.appointment_end_time), "h:mm a")}`}
                </p>
              </div>
            </div>

            {bookingDetails.is_telehealth ? (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">Telehealth (Virtual)</p>
                </div>
              </div>
            ) : bookingDetails.hospital_name && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{bookingDetails.hospital_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reason for Visit */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Visit *</Label>
            <Textarea
              id="reason"
              placeholder="Please describe the reason for your visit..."
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This helps your doctor prepare for your appointment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleClaimAppointment}
              disabled={booking || !reasonForVisit.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {booking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Appointment
                </>
              )}
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              disabled={booking}
            >
              Cancel
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-medium mb-1">Important</p>
            <p className="text-sm text-yellow-800">
              This appointment slot is reserved for you for a limited time.
              Please confirm as soon as possible to secure your appointment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

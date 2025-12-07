"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, X, User, Calendar, Clock, Video, MapPin } from "lucide-react";
import { useSwapAppointment } from "./SwapAppointmentContext";
import { format } from "date-fns";

export function SwapModeBanner() {
  const { isSwapMode, firstAppointment, cancelSwapMode } = useSwapAppointment();

  if (!isSwapMode || !firstAppointment) return null;

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 shadow-lg">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)`,
        }} />
      </div>
      
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Icon with pulse animation */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-xl animate-ping opacity-20" />
              <div className="relative p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                <ArrowLeftRight className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-lg text-blue-900">
                  Swap Mode Active
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-200 rounded-full animate-pulse">
                  Step 1 of 2
                </span>
              </div>
              
              {/* Selected appointment card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="p-1.5 bg-blue-100 rounded-md">
                      <User className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {firstAppointment.patient_name}
                      </p>
                      <p className="text-xs text-gray-500">Selected appointment</p>
                    </div>
                  </div>
                  
                  {/* Appointment type badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                    firstAppointment.is_telehealth 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {firstAppointment.is_telehealth ? (
                      <>
                        <Video className="w-3 h-3" />
                        <span>Telehealth</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3" />
                        <span>In-Person</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Time details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {format(new Date(firstAppointment.start_time), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {format(new Date(firstAppointment.start_time), "h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Instruction text */}
              <div className="mt-3 flex items-start gap-2">
                <div className="mt-0.5 p-1 bg-blue-100 rounded">
                  <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-sm text-blue-800 font-medium">
                  Now select another appointment to swap times with this one
                </p>
              </div>
            </div>
          </div>
          
          {/* Cancel button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelSwapMode}
            className="text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent hover:border-gray-200 transition-all"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

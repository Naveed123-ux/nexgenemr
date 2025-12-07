"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { UpcomingAppointment } from "./types";

interface SwapAppointmentContextType {
  firstAppointment: UpcomingAppointment | null;
  setFirstAppointment: (appointment: UpcomingAppointment | null) => void;
  isSwapMode: boolean;
  startSwapMode: (appointment: UpcomingAppointment) => void;
  cancelSwapMode: () => void;
}

const SwapAppointmentContext = createContext<SwapAppointmentContextType | undefined>(undefined);

export function SwapAppointmentProvider({ children }: { children: ReactNode }) {
  const [firstAppointment, setFirstAppointment] = useState<UpcomingAppointment | null>(null);
  const [isSwapMode, setIsSwapMode] = useState(false);

  const startSwapMode = (appointment: UpcomingAppointment) => {
    setFirstAppointment(appointment);
    setIsSwapMode(true);
  };

  const cancelSwapMode = () => {
    setFirstAppointment(null);
    setIsSwapMode(false);
  };

  return (
    <SwapAppointmentContext.Provider
      value={{
        firstAppointment,
        setFirstAppointment,
        isSwapMode,
        startSwapMode,
        cancelSwapMode,
      }}
    >
      {children}
    </SwapAppointmentContext.Provider>
  );
}

export function useSwapAppointment() {
  const context = useContext(SwapAppointmentContext);
  if (context === undefined) {
    throw new Error("useSwapAppointment must be used within a SwapAppointmentProvider");
  }
  return context;
}

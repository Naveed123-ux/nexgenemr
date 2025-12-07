"use client";

import { Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react"; 

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  userName?: string;
}

export function AdminHeader({
  title = "Welcome Back",
  subtitle = " ",
  userName = "",
}: AdminHeaderProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); // <-- Use state for the date

  useEffect(() => {
    // Set up an interval to update the date every minute
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // 60000 milliseconds = 1 minute

    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(timer);
    };
  }, []); // The empty dependency array ensures the effect runs only once

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center md:mt-4 mt-7 mb-5 md:mb-5 gap-4 lg:py-3 py-2 md:px-4 px-2">
      <div>
        <h1
          className="text-xl md:text-2xl font-semibold text-gray-500
"
        >
          {title}, {userName ? userName : "...loading"}
        </h1>
        <p className="text-gray-600 text-[14px] mt-3">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}

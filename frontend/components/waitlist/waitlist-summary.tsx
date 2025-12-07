"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { privateApi } from "@/lib/axios";
import { InfinitySpin } from "react-loader-spinner";
import { Users, AlertCircle, Calendar } from "lucide-react";

interface WaitlistSummaryData {
  total_pending: number;
  high_priority_count: number;
  by_day: {
    Mon?: number;
    Tue?: number;
    Wed?: number;
    Thu?: number;
    Fri?: number;
    Anytime?: number;
  };
}

interface WaitlistSummaryProps {
  doctorId: number;
}

export function WaitlistSummary({ doctorId }: WaitlistSummaryProps) {
  const [summary, setSummary] = useState<WaitlistSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await privateApi.get(
          `/api/waitlist/doctors/${doctorId}/summary`
        );
        setSummary(response.data);
      } catch (err: any) {
        console.error("Failed to fetch waitlist summary:", err);
        setError(err.response?.data?.detail || "Failed to load waitlist data");
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchSummary();
    }
  }, [doctorId]);

  if (loading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-black-600">
            Waitlist Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <InfinitySpin width="100" color="#388fe5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-black-600">
            Waitlist Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Anytime"];
  const maxDayCount = Math.max(...Object.values(summary.by_day), 1);

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-medium text-black-600">
          Waitlist Demand
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {summary.total_pending}
              </div>
              <div className="text-xs text-gray-500">Total Pending</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {summary.high_priority_count}
              </div>
              <div className="text-xs text-gray-500">High Priority</div>
            </div>
          </div>
        </div>

        {/* Day Distribution */}
        {summary.total_pending > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4" />
              <span>Day Preferences</span>
            </div>
            <div className="space-y-2">
              {dayOrder.map((day) => {
                const count = summary.by_day[day as keyof typeof summary.by_day] || 0;
                const percentage = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;

                if (count === 0) return null;

                return (
                  <div key={day} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">{day}</span>
                      <span className="text-gray-900 font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${day === "Anytime"
                            ? "bg-purple-500"
                            : "bg-blue-500"
                          }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {summary.total_pending === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No patients currently on waitlist
          </div>
        )}
      </CardContent>
    </Card>
  );
}

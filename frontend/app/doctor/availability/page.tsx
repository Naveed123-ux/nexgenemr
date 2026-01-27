"use client";

import ManageAvailability from "@/components/manage-availability";

export default function AvailabilityPage() {
  return (
    <div className="bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Your Availability</h1>
          <p className="text-gray-600 mt-2">
            Create and manage your appointment availability patterns. Slots are automatically generated based on your patterns.
          </p>
        </div>
        <ManageAvailability />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminHeader } from "@/components/admin-header";

export default function ConfigurePage() {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="p-6 max-w-4xl">
      {/* Configure Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">Configure</h2>

          {/* Tabs */}
          <div className="flex gap-8 mb-8 border-b">
            <button
              onClick={() => setActiveTab("personal")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "personal"
                  ? "border-blue-500 text-green-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "features"
                  ? "border-blue-500 text-green-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Feature Toggles
            </button>
          </div>

          {/* Personal Info Tab */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <h3 className="font-medium text-gray-900">Legal name</h3>
                  <p className="text-sm text-gray-600">Doctor Robert Patel</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <h3 className="font-medium text-gray-900">Email address</h3>
                  <p className="text-sm text-gray-600">h***@gmail.com</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <h3 className="font-medium text-gray-900">Phone numbers</h3>
                  <p className="text-sm text-gray-600">
                    Add a number so confirmed guests and Airbnb can get in
                    touch. You can add other numbers and choose how they're
                    used.
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <h3 className="font-medium text-gray-900">Government ID</h3>
                  <p className="text-sm text-gray-600">Not provided</p>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <h3 className="font-medium text-gray-900">Address</h3>
                  <p className="text-sm text-gray-600">Not provided</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Emergency contact
                  </h3>
                  <p className="text-sm text-gray-600">Not provided</p>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Feature Toggles Tab */}
          {activeTab === "features" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Appointment Scheduling
                  </h3>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    AI Decision Support
                  </h3>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">Sound effects</h3>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">Animations</h3>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Prescription Module
                  </h3>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Backup & Restore
                  </h3>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

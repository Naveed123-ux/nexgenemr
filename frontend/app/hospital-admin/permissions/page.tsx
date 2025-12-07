"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import UpdateInfo from "../_Components/UpdateInfo";

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState("permissions");
  const [permissions, setPermissions] = useState({
    patientRecords: false,
    scheduling: true,
    labResults: true,
    reports: true,
    prescription: true,
    backupRestore: true,
  });

  const handlePermissionChange = (key: string, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Permissions & Data
          </h2>
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("permissions")}
              className={`pb-2 border-b-2 font-medium ${
                activeTab === "permissions"
                  ? "border-blue-500 text-green-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Permissions
            </button>
            <button
              onClick={() => setActiveTab("dataManagement")}
              className={`pb-2 border-b-2 font-medium ${
                activeTab === "dataManagement"
                  ? "border-blue-500 text-green-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Data Management
            </button>
            <button
              onClick={() => setActiveTab("updateInfo")}
              className={`pb-2 border-b-2 font-medium ${
                activeTab === "updateInfo"
                  ? "border-blue-500 text-green-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Update Info
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "permissions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Patient Records</span>
                <Switch
                  checked={permissions.patientRecords}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("patientRecords", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Scheduling</span>
                <Switch
                  checked={permissions.scheduling}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("scheduling", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Lab Results</span>
                <Switch
                  checked={permissions.labResults}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("labResults", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Reports</span>
                <Switch
                  checked={permissions.reports}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("reports", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Prescription</span>
                <Switch
                  checked={permissions.prescription}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("prescription", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <span className="text-gray-700">Backup & Restore</span>
                <Switch
                  checked={permissions.backupRestore}
                  onCheckedChange={(checked) =>
                    handlePermissionChange("backupRestore", checked)
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "dataManagement" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <div className="font-medium text-gray-900">Legal name</div>
                  <div className="text-gray-500">Doctor Robert Patel</div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <div className="font-medium text-gray-900">Email address</div>
                  <div className="text-gray-500">h***oe@emailmail0.com</div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <div className="font-medium text-gray-900">Phone numbers</div>
                  <div className="text-gray-500 text-sm">
                    Add a number so confirmed guests and Airbnb can get in
                    touch. You can add other numbers and choose how they're
                    used.
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <div className="font-medium text-gray-900">Government ID</div>
                  <div className="text-gray-500">Not provided</div>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <div className="font-medium text-gray-900">Address</div>
                  <div className="text-gray-500">Not provided</div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium text-gray-900">
                    Emergency contact
                  </div>
                  <div className="text-gray-500">Not provided</div>
                </div>
                <Button variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>
          )}
          {activeTab === "updateInfo" && <UpdateInfo />}
        </div>
      </div>
    </div>
  );
}

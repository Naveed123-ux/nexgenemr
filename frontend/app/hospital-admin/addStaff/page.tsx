"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import CreateDoctor from "../_Components/CreateDoctor";
import CreateStaff from "../_Components/CreateStaff";

export default function HospitalStaffPage() {
  const [activeTab, setActiveTab] = useState("doctors");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          className={`bg-green-primary text-white cursor-pointer ${
            activeTab === "doctors"
              ? "bg-white text-green-primary hover:bg-white"
              : " hover:bg-green-primary"
          }`}
          onClick={() => setActiveTab("doctors")}
        >
          Doctors
        </Button>
        <Button
          className={`bg-green-primary text-white cursor-pointer ${
            activeTab === "staff"
              ? "bg-white text-green-primary hover:bg-white"
              : " hover:bg-green-primary"
          }`}
          onClick={() => setActiveTab("staff")}
        >
          Staff
        </Button>
      </div>
      {/* Hospital Staff Table */}
      <div className="p-0">
        {activeTab === "doctors" && <CreateDoctor />}
        {activeTab === "staff" && <CreateStaff />}
      </div>

      {/* Staff Summary Cards */}
      {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {staffSummary.map((item, index) => (
          <Card key={index} className="p-4 text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {item.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
          </Card>
        ))}
      </div> */}
    </div>
  );
}

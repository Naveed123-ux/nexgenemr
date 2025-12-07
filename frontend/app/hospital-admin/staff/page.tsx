"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Users,
  UserCheck,
  Stethoscope,
  Filter,
  Download,
  Plus,
  TrendingUp,
  Activity
} from "lucide-react";
import AllDoctorsTable from "../_Components/AllDoctors";
import AllStaffTable from "../_Components/AllStaff";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

export default function HospitalStaffPage() {
  const [activeTab, setActiveTab] = useState("doctors");
  const [searchQuery, setSearchQuery] = useState("");

  // Get data from Redux store
  const { AllDoctors: doctorsList, total: doctorsTotal } = useSelector((state: RootState) => state.allDoctors);
  const { AllStaff: staffList, total: staffTotal } = useSelector((state: RootState) => state.allStaff);

  // Calculate statistics
  const totalStaff = (doctorsTotal || 0) + (staffTotal || 0);
  const activeStaff = totalStaff; // Assuming all are active
  const newThisMonth = Math.floor(totalStaff * 0.1); // 10% as example

  const statsCards = [
    {
      title: "Total Staff",
      value: totalStaff,
      icon: Users,
      color: "bg-blue-500",
      trend: "+12%",
      description: "All staff members"
    },
    {
      title: "Doctors",
      value: doctorsTotal || 0,
      icon: Stethoscope,
      color: "bg-[#388fe5]",
      trend: "+5%",
      description: "Medical professionals"
    },
    {
      title: "Staff Members",
      value: staffTotal || 0,
      icon: UserCheck,
      color: "bg-purple-500",
      trend: "+8%",
      description: "Support staff"
    },
    {
      title: "Active Today",
      value: activeStaff,
      icon: Activity,
      color: "bg-orange-500",
      trend: "100%",
      description: "Currently active"
    },
  ];
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage your hospital's doctors and staff members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="bg-[#388fe5] hover:bg-[#6fb043] text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {stat.value}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {stat.trend}
                      </Badge>
                      <span className="text-xs text-gray-500">{stat.description}</span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Staff Directory
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-6 pt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100">
                <TabsTrigger
                  value="doctors"
                  className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
                >
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Doctors ({doctorsTotal || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Staff ({staffTotal || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="doctors" className="m-0">
              <AllDoctorsTable />
            </TabsContent>

            <TabsContent value="staff" className="m-0">
              <AllStaffTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

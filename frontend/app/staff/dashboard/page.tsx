"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { NotificationsPanel } from "@/components/notifications-panel";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { fetchDepartments } from "@/store/slices/departmentSlice";

import toast from "react-hot-toast";

export default function HospitalAdminDashboard() {
  const staffSummary = [
    { title: "Nurses", count: 8 },
    { title: "Techs", count: 4 },
    { title: "Provider", count: 2 },
    { title: "Social Worker", count: 2 },
    { title: "Therapy", count: 3 },
    { title: "EVS", count: 3 },
  ];

  return (
    <>
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Left side - 2x2 cards grid */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {/* Top row */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Hospital Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-bold text-[#388fe5]">
                    125
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 md:w-6 md:h-6 bg-white rounded-full opacity-80"></div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-bold text-[#388fe5]">
                    218
                  </div>
                  <div className="flex gap-1 items-end">
                    {[4, 6, 3, 8, 5, 9, 4, 7, 6].map((height, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-blue-400 rounded-full"
                        style={{ height: `${height * 3}px` }}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-pink-500 h-2 rounded-full"
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom row */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Daily patients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-bold text-[#388fe5]">
                    25
                  </div>
                  <div className="w-12 md:w-16 h-6 md:h-8">
                    <svg viewBox="0 0 60 30" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        points="0,20 10,15 20,18 30,12 40,16 50,10 60,14"
                      />
                    </svg>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "45%" }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Lab usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl md:text-3xl font-bold text-[#388fe5]">
                    2,479
                  </div>
                  <div className="w-12 md:w-16 h-6 md:h-8">
                    <svg viewBox="0 0 60 30" className="w-full h-full">
                      <path
                        fill="rgba(59, 130, 246, 0.3)"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        d="M0,25 L10,20 L20,22 L30,15 L40,18 L50,12 L60,16 L60,30 L0,30 Z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: "85%" }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white shadow-sm rounded-lg border lg:col-span-1">
            <NotificationsPanel />
          </div>
        </div>

        <Card className="bg-white shadow-sm w-full mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Hospital Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">
                      Name
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden sm:table-cell">
                      Intubated
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden sm:table-cell">
                      Mobility
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden md:table-cell">
                      Incontinent
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden md:table-cell">
                      Alert Oriented
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden md:table-cell">
                      Surgery
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm hidden md:table-cell">
                      Isolation
                    </th>
                    <th className="text-left py-3 px-2 md:px-4 font-medium text-gray-600 text-sm">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm">
                        Jane Doe
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden sm:table-cell">
                        No
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden sm:table-cell">
                        IPA
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden md:table-cell">
                        Yes
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden md:table-cell">
                        x 4
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden md:table-cell">
                        Yes
                      </td>
                      <td className="py-3 px-2 md:px-4 text-gray-700 text-sm hidden md:table-cell">
                        Droplet
                      </td>
                      <td className="py-3 px-2 md:px-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            ⋯
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {staffSummary.map((item, index) => (
            <Card key={index} className="p-4 text-center bg-white shadow-sm">
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {item.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900">{item.count}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

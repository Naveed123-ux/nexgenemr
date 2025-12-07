"use client";

import React from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import {
  cancelExistingPrescription,
  deleteExistingPrescription,
} from "@/store/slices/prescriptionSlice";
import { Prescription } from "@/hooks/types/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, XCircle, Pill, Calendar, User, Clock, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import toast from "react-hot-toast";

interface PrescriptionListProps {
  prescriptions: Prescription[];
}

export function PrescriptionList({ prescriptions }: PrescriptionListProps) {
  const dispatch = useDispatch<AppDispatch>();

  const handleCancel = (id: number) => {
    toast.promise(dispatch(cancelExistingPrescription(id)).unwrap(), {
      loading: "Cancelling...",
      success: "Prescription cancelled!",
      error: (err) => err || "Failed to cancel.",
    });
  };

  const handleDelete = (id: number) => {
    toast.promise(dispatch(deleteExistingPrescription(id)).unwrap(), {
      loading: "Deleting...",
      success: "Prescription deleted!",
      error: (err) => err || "Failed to delete.",
    });
  };

  return (
    <Card className="shadow-lg border-2 border-gray-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Patient Prescriptions</CardTitle>
              <CardDescription className="mt-1">
                {prescriptions.length} {prescriptions.length === 1 ? 'prescription' : 'prescriptions'} on record
              </CardDescription>
            </div>
          </div>
          {prescriptions.length > 0 && (
            <Badge variant="outline" className="text-sm">
              {prescriptions.filter(p => p.status === 'active').length} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Pill className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No prescriptions found</p>
            <p className="text-gray-400 text-sm mt-1">Create a new prescription to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((p) => (
              <Card
                key={p.id}
                className={`overflow-hidden transition-all hover:shadow-md ${p.status === "active"
                    ? "border-l-4 border-l-green-500"
                    : "border-l-4 border-l-gray-300 opacity-75"
                  }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Section - Medication Info */}
                    <div className="flex-1 space-y-3">
                      {/* Header with Medication Name and Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${p.status === "active" ? "bg-green-100" : "bg-gray-100"
                            }`}>
                            <Pill className={`h-5 w-5 ${p.status === "active" ? "text-[#388fe5]" : "text-gray-400"
                              }`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{p.medication}</h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {p.dosage} • {p.frequency}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${p.status === "active"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                          {p.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {p.status}
                        </Badge>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Prescribed by:</span>
                          <span className="font-medium text-gray-900">{p.doctor_name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium text-gray-900">
                            {p.start_date} → {p.end_date || "Ongoing"}
                          </span>
                        </div>
                      </div>

                      {/* Notes */}
                      {p.notes && (
                        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Instructions</p>
                              <p className="text-sm text-blue-800">{p.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex lg:flex-col gap-2 lg:items-end">
                      {p.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(p.id)}
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(p.id)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

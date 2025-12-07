"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  FileDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  fetchPatientSummaries,
  downloadPDFThunk,
  downloadWordThunk,
  clearErrors,
} from "@/store/slices/dischargeSummarySlice";
import { triggerFileDownload } from "@/app/_apis/dischargeSummaries";

export default function PatientDischargeSummaries() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    patientSummaries = [],
    patientSummariesLoading = false,
    patientSummariesError = null,
    downloading = null,
    downloadError = null,
  } = useSelector((state: RootState) => state.dischargeSummaries || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchPatientSummaries());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (patientSummariesError) {
      toast.error(patientSummariesError);
      dispatch(clearErrors());
    }
  }, [patientSummariesError, dispatch]);

  useEffect(() => {
    if (downloadError) {
      toast.error(downloadError);
      dispatch(clearErrors());
    }
  }, [downloadError, dispatch]);

  const loadSummaries = () => {
    dispatch(fetchPatientSummaries());
  };

  const handleViewSummary = (summary: any) => {
    setSelectedSummary(summary);
    setViewDialog(true);
  };

  const handleDownloadPDF = async (summary: any) => {
    try {
      const result = await dispatch(downloadPDFThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `discharge_summary_${new Date(summary.discharge_date).toLocaleDateString()}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleDownloadWord = async (summary: any) => {
    try {
      const result = await dispatch(downloadWordThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `discharge_summary_${new Date(summary.discharge_date).toLocaleDateString()}.docx`);
      toast.success("Word document downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const filteredSummaries = useMemo(() => {
    if (!searchTerm.trim()) {
      return patientSummaries;
    }
    return patientSummaries.filter(
      (summary) =>
        summary.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.discharge_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(summary.discharge_date).toLocaleDateString().includes(searchTerm)
    );
  }, [searchTerm, patientSummaries]);

  if (patientSummariesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <InfinitySpin width="200" color="#388fe5" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Discharge Summaries</h1>
          <p className="text-gray-600 mt-1">View and download your hospital discharge records</p>
        </div>
        <Button onClick={loadSummaries} variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Discharge Summaries</p>
            <p className="text-3xl font-bold text-gray-900">{patientSummaries.length}</p>
            <p className="text-sm text-gray-500 mt-1">
              {patientSummaries.length === 0
                ? "No discharge summaries yet"
                : `Last discharge: ${new Date(patientSummaries[0]?.discharge_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by doctor, diagnosis, or date..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Summaries List */}
      {filteredSummaries.length === 0 ? (
        <Card className="p-12 bg-white">
          <div className="text-center text-gray-500">
            <FileText className="mx-auto h-20 w-20 mb-4 opacity-30" />
            <p className="text-lg font-medium">No discharge summaries found</p>
            <p className="text-sm mt-2">
              {patientSummaries.length === 0
                ? "Your discharge summaries will appear here after you are discharged from the hospital"
                : "Try adjusting your search terms"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSummaries.map((summary) => (
            <Card key={summary.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        Discharge Summary
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(summary.discharge_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Attending Doctor</p>
                      <p className="text-sm font-medium text-gray-900">
                        {summary.doctor_name || `Doctor #${summary.doctor_user_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hospital Stay</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(summary.admission_date).toLocaleDateString()} -{" "}
                        {new Date(summary.discharge_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {summary.discharge_diagnosis && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {summary.discharge_diagnosis}
                      </p>
                    </div>
                  )}

                  {summary.follow_up_plan && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-yellow-800 mb-1">
                            Follow-up Required
                          </p>
                          <p className="text-xs text-yellow-700 line-clamp-2">
                            {summary.follow_up_plan}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewSummary(summary)}
                    className="whitespace-nowrap"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadPDF(summary)}
                    disabled={downloading?.id === summary.id && downloading?.type === "pdf"}
                    className="bg-[#388fe5] hover:bg-[#6fb043] text-white whitespace-nowrap"
                  >
                    {downloading?.id === summary.id && downloading?.type === "pdf" ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <FileDown className="w-3 h-3 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadWord(summary)}
                    disabled={downloading?.id === summary.id && downloading?.type === "word"}
                    className="whitespace-nowrap"
                  >
                    {downloading?.id === summary.id && downloading?.type === "word" ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    Word
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Discharge Summary Details</DialogTitle>
          </DialogHeader>
          {selectedSummary && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Discharge Date</p>
                  <p className="font-semibold">
                    {new Date(selectedSummary.discharge_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Attending Doctor</p>
                  <p className="font-semibold">
                    {selectedSummary.doctor_name || `Doctor #${selectedSummary.doctor_user_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admission Date</p>
                  <p className="font-semibold">
                    {new Date(selectedSummary.admission_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Length of Stay</p>
                  <p className="font-semibold">
                    {Math.ceil(
                      (new Date(selectedSummary.discharge_date).getTime() -
                        new Date(selectedSummary.admission_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                  </p>
                </div>
              </div>

              {/* AI Summary */}
              {selectedSummary.ai_generated_summary && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <span className="text-blue-600">✨</span> Summary
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg border border-blue-200">
                    {selectedSummary.ai_generated_summary}
                  </p>
                </div>
              )}

              {/* Hospital Course */}
              {selectedSummary.hospital_course && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Hospital Course</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {selectedSummary.hospital_course}
                  </p>
                </div>
              )}

              {/* Discharge Diagnosis */}
              {selectedSummary.discharge_diagnosis && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Diagnosis</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-red-50 p-4 rounded-lg border border-red-200">
                    {selectedSummary.discharge_diagnosis}
                  </p>
                </div>
              )}

              {/* Medications */}
              {selectedSummary.discharge_medications && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Medications to Continue</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 p-4 rounded-lg border border-green-200">
                    {selectedSummary.discharge_medications}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {selectedSummary.discharge_instructions && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Discharge Instructions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    {selectedSummary.discharge_instructions}
                  </p>
                </div>
              )}

              {/* Follow-up Plan */}
              {selectedSummary.follow_up_plan && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Follow-up Plan
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-purple-50 p-4 rounded-lg border border-purple-200">
                    {selectedSummary.follow_up_plan}
                  </p>
                </div>
              )}

              {/* Diet and Activity */}
              {selectedSummary.diet_and_activity && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Diet and Activity</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 p-4 rounded-lg border border-orange-200">
                    {selectedSummary.diet_and_activity}
                  </p>
                </div>
              )}

              {/* Warning Signs */}
              {selectedSummary.warning_signs && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Warning Signs - Seek Immediate Care
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-red-50 p-4 rounded-lg border-2 border-red-300">
                    {selectedSummary.warning_signs}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Close
            </Button>
            {selectedSummary && (
              <>
                <Button
                  onClick={() => handleDownloadPDF(selectedSummary)}
                  disabled={downloading?.id === selectedSummary.id}
                  className="bg-[#388fe5] hover:bg-[#6fb043]"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => handleDownloadWord(selectedSummary)}
                  disabled={downloading?.id === selectedSummary.id}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Word
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

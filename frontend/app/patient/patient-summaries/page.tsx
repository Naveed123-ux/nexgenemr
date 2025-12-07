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
  Sparkles,
  Loader2,
  FileDown,
  Calendar,
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  fetchMySummaries,
  fetchPatientSummary,
  downloadPDFThunk,
  downloadWordThunk,
  clearErrors,
  clearSelectedSummary,
} from "@/store/slices/patientSummarySlice";
import { triggerFileDownload } from "@/app/_apis/patientSummaries";

export default function PatientSummaries() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    mySummaries = [],
    mySummariesLoading = false,
    mySummariesError = null,
    selectedSummary = null,
    selectedSummaryLoading = false,
    downloading = null,
    downloadError = null,
  } = useSelector((state: RootState) => state.patientSummaries || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialog, setViewDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchMySummaries());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (mySummariesError) {
      toast.error(mySummariesError);
      dispatch(clearErrors());
    }
  }, [mySummariesError, dispatch]);

  useEffect(() => {
    if (downloadError) {
      toast.error(downloadError);
      dispatch(clearErrors());
    }
  }, [downloadError, dispatch]);

  const handleViewSummary = async (summaryId: number) => {
    try {
      await dispatch(fetchPatientSummary(summaryId)).unwrap();
      setViewDialog(true);
    } catch (error: any) {
      toast.error("Failed to load summary");
    }
  };

  const handleDownloadPDF = async (summary: any) => {
    try {
      const result = await dispatch(downloadPDFThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `health_summary_${summary.id}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleDownloadWord = async (summary: any) => {
    try {
      const result = await dispatch(downloadWordThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `health_summary_${summary.id}.docx`);
      toast.success("Word document downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialog(false);
    dispatch(clearSelectedSummary());
  };

  const filteredSummaries = useMemo(() => {
    if (!searchTerm.trim()) {
      return mySummaries;
    }
    return mySummaries.filter(
      (summary) =>
        summary.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.your_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, mySummaries]);

  const stats = useMemo(
    () => ({
      total: mySummaries.length,
      new: mySummaries.filter((s) => !s.is_viewed_by_patient).length,
      thisMonth: mySummaries.filter(
        (s) => {
          const summaryDate = new Date(s.summary_date);
          const now = new Date();
          return (
            summaryDate.getMonth() === now.getMonth() &&
            summaryDate.getFullYear() === now.getFullYear()
          );
        }
      ).length,
    }),
    [mySummaries]
  );

  if (mySummariesLoading && mySummaries.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">My Health Summaries</h1>
          <p className="text-gray-600 mt-1">Easy-to-understand summaries of your health visits</p>
        </div>
        <Button onClick={() => dispatch(fetchMySummaries())} variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Summaries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-[#388fe5]" />
            </div>
            <div>
              <p className="text-sm text-gray-600">New Summaries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-6 bg-white">
        <div className="relative w-full md:w-96 mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Summaries List */}
        <div className="space-y-4">
          {filteredSummaries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No health summaries yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Your doctor will create summaries after your visits
              </p>
            </div>
          ) : (
            filteredSummaries.map((summary) => (
              <Card
                key={summary.id}
                className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${!summary.is_viewed_by_patient ? "border-2 border-green-500" : ""
                  }`}
                onClick={() => handleViewSummary(summary.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{summary.title}</h3>
                      {!summary.is_viewed_by_patient && (
                        <Badge className="bg-green-500">
                          <Sparkles className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(summary.summary_date), "MMM dd, yyyy")}
                      </span>
                      {summary.doctor_name && (
                        <span>Dr. {summary.doctor_name}</span>
                      )}
                    </div>
                    {summary.your_diagnosis && (
                      <p className="text-gray-700 line-clamp-2 mb-3">{summary.your_diagnosis}</p>
                    )}
                    {/* Download Buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(summary);
                        }}
                        disabled={downloading?.id === summary.id && downloading?.type === "pdf"}
                        className="text-xs"
                      >
                        {downloading?.id === summary.id && downloading?.type === "pdf" ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <FileDown className="w-3 h-3 mr-1" />
                        )}
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadWord(summary);
                        }}
                        disabled={downloading?.id === summary.id && downloading?.type === "word"}
                        className="text-xs"
                      >
                        {downloading?.id === summary.id && downloading?.type === "word" ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Download className="w-3 h-3 mr-1" />
                        )}
                        Word
                      </Button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSummary(summary.id);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={handleCloseViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Your Health Summary</DialogTitle>
          </DialogHeader>
          {selectedSummaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#388fe5]" />
            </div>
          ) : selectedSummary ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedSummary.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedSummary.summary_date), "MMMM dd, yyyy")}
                  </span>
                  {selectedSummary.doctor_name && (
                    <span>Dr. {selectedSummary.doctor_name}</span>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {selectedSummary.ai_generated_summary && (
                <div className="p-5 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Quick Summary</h3>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {selectedSummary.ai_generated_summary}
                  </p>
                </div>
              )}

              {/* What We Found */}
              {selectedSummary.what_we_found && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">🔍 What We Found</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.what_we_found}
                  </p>
                </div>
              )}

              {/* What It Means */}
              {selectedSummary.what_it_means && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">💡 What It Means</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.what_it_means}
                  </p>
                </div>
              )}

              {/* Your Diagnosis */}
              {selectedSummary.your_diagnosis && (
                <div className="p-5 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                  <h3 className="text-xl font-semibold text-purple-900 mb-3">🏥 Your Diagnosis</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.your_diagnosis}
                  </p>
                </div>
              )}

              {/* Your Treatment Plan */}
              {selectedSummary.your_treatment_plan && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">📋 Your Treatment Plan</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.your_treatment_plan}
                  </p>
                </div>
              )}

              {/* Your Medications */}
              {selectedSummary.your_medications && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">💊 Your Medications</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.your_medications}
                  </p>
                </div>
              )}

              {/* What to Watch For */}
              {selectedSummary.what_to_watch_for && (
                <div className="p-5 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-900 mb-3">⚠️ What to Watch For</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.what_to_watch_for}
                  </p>
                </div>
              )}

              {/* Next Steps */}
              {selectedSummary.next_steps && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">👣 Next Steps</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.next_steps}
                  </p>
                </div>
              )}

              {/* Lifestyle Tips */}
              {selectedSummary.lifestyle_tips && (
                <div className="p-5 bg-green-50 border-l-4 border-green-500 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-900 mb-3">🌟 Lifestyle Tips</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.lifestyle_tips}
                  </p>
                </div>
              )}

              {/* Questions to Ask */}
              {selectedSummary.questions_to_ask && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">❓ Questions You Might Have</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.questions_to_ask}
                  </p>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedSummary.doctor_notes && (
                <div className="p-5 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">📝 Note from Your Doctor</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.doctor_notes}
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              {selectedSummary.special_instructions && (
                <div className="p-5 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                  <h3 className="text-xl font-semibold text-yellow-900 mb-3">⭐ Special Instructions</h3>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                    {selectedSummary.special_instructions}
                  </p>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            {selectedSummary && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => handleDownloadPDF(selectedSummary)}
                  disabled={downloading?.id === selectedSummary.id && downloading?.type === "pdf"}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  {downloading?.id === selectedSummary.id && downloading?.type === "pdf" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
                <Button
                  onClick={() => handleDownloadWord(selectedSummary)}
                  disabled={downloading?.id === selectedSummary.id && downloading?.type === "word"}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  {downloading?.id === selectedSummary.id && downloading?.type === "word" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Word
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

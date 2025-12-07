"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Eye,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Edit,
  Clock,
  FileDown,
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  fetchRecentPatientSummaries,
  fetchUnviewedPatientSummaries,
  createPatientSummaryThunk,
  updatePatientSummaryThunk,
  downloadPDFThunk,
  downloadWordThunk,
  clearErrors,
} from "@/store/slices/patientSummarySlice";
import { triggerFileDownload } from "@/app/_apis/patientSummaries";
import { privateApi } from "@/lib/axios";
import DocumentSignButton from "@/components/DocumentSignButton";

export default function DoctorPatientSummaries() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    recentSummaries = [],
    recentSummariesLoading = false,
    recentSummariesError = null,
    unviewedSummaries = [],
    unviewedSummariesLoading = false,
    unviewedSummariesError = null,
    creating = false,
    createError = null,
    updating = false,
    updateError = null,
    downloading = null,
    downloadError = null,
  } = useSelector((state: RootState) => state.patientSummaries || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Create summary state
  const [createDialog, setCreateDialog] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [title, setTitle] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Edit state
  const [editDialog, setEditDialog] = useState(false);
  const [editingSummary, setEditingSummary] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDoctorNotes, setEditDoctorNotes] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");

  useEffect(() => {
    dispatch(fetchRecentPatientSummaries(100));
    dispatch(fetchUnviewedPatientSummaries());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (recentSummariesError) {
      toast.error(recentSummariesError);
      dispatch(clearErrors());
    }
  }, [recentSummariesError, dispatch]);

  useEffect(() => {
    if (unviewedSummariesError) {
      toast.error(unviewedSummariesError);
      dispatch(clearErrors());
    }
  }, [unviewedSummariesError, dispatch]);

  useEffect(() => {
    if (createError) {
      toast.error(createError);
      dispatch(clearErrors());
    }
  }, [createError, dispatch]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError);
      dispatch(clearErrors());
    }
  }, [updateError, dispatch]);

  useEffect(() => {
    if (downloadError) {
      toast.error(downloadError);
      dispatch(clearErrors());
    }
  }, [downloadError, dispatch]);

  // Search patients using API
  useEffect(() => {
    if (patientSearchTerm.trim().length < 2) {
      setPatientResults([]);
      return;
    }

    const searchPatients = async () => {
      setIsSearching(true);
      try {
        const response = await privateApi.get('/patients/search', {
          params: {
            q: patientSearchTerm,
            page: 1,
            limit: 20
          }
        });
        console.log('Search results:', response.data);
        setPatientResults(response.data.data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setPatientResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm]);

  const loadSummaries = () => {
    dispatch(fetchRecentPatientSummaries(100));
    dispatch(fetchUnviewedPatientSummaries());
  };

  const handleViewSummary = (summary: any) => {
    setSelectedSummary(summary);
    setViewDialog(true);
  };

  const handleDownloadPDF = async (summary: any) => {
    try {
      const result = await dispatch(downloadPDFThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `patient_summary_${summary.id}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleDownloadWord = async (summary: any) => {
    try {
      const result = await dispatch(downloadWordThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `patient_summary_${summary.id}.docx`);
      toast.success("Word document downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleCreateSummary = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide a title");
      return;
    }

    try {
      await dispatch(
        createPatientSummaryThunk({
          patient_user_id: selectedPatient.user_id,
          title: title.trim(),
          doctor_notes: doctorNotes.trim() || undefined,
          special_instructions: specialInstructions.trim() || undefined,
        })
      ).unwrap();

      toast.success("Patient summary created successfully!");
      setCreateDialog(false);
      resetCreateForm();
      dispatch(fetchRecentPatientSummaries(100));
      dispatch(fetchUnviewedPatientSummaries());
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleEditSummary = (summary: any) => {
    setEditingSummary(summary);
    setEditTitle(summary.title || "");
    setEditDoctorNotes(summary.doctor_notes || "");
    setEditSpecialInstructions(summary.special_instructions || "");
    setEditDialog(true);
  };

  const handleUpdateSummary = async () => {
    if (!editingSummary) return;

    try {
      await dispatch(
        updatePatientSummaryThunk({
          summaryId: editingSummary.id,
          data: {
            title: editTitle.trim() || undefined,
            doctor_notes: editDoctorNotes.trim() || undefined,
            special_instructions: editSpecialInstructions.trim() || undefined,
          },
        })
      ).unwrap();

      toast.success("Patient summary updated successfully!");
      setEditDialog(false);
      setEditingSummary(null);
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const resetCreateForm = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setPatientResults([]);
    setTitle("");
    setDoctorNotes("");
    setSpecialInstructions("");
  };

  const handleCloseCreateDialog = () => {
    setCreateDialog(false);
    resetCreateForm();
  };

  const filteredSummaries = useMemo(() => {
    const summaries = activeTab === "unviewed" ? unviewedSummaries : recentSummaries;
    if (!searchTerm.trim()) {
      return summaries;
    }
    return summaries.filter(
      (summary) =>
        summary.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.your_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, recentSummaries, unviewedSummaries, activeTab]);

  const stats = useMemo(
    () => ({
      total: recentSummaries.length,
      unviewed: unviewedSummaries.length,
      viewed: recentSummaries.filter((s) => s.is_viewed_by_patient).length,
      thisWeek: recentSummaries.filter(
        (s) => {
          const summaryDate = new Date(s.summary_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return summaryDate >= weekAgo;
        }
      ).length,
    }),
    [recentSummaries, unviewedSummaries]
  );

  if (recentSummariesLoading && recentSummaries.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Patient-Friendly Summaries</h1>
          <p className="text-gray-600 mt-1">Create easy-to-understand health summaries for patients</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-[#388fe5] hover:bg-[#6fb043]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Summary
          </Button>
          <Button onClick={loadSummaries} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unviewed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unviewed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-[#388fe5]" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Viewed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.viewed}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card className="p-6 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="all">All Summaries</TabsTrigger>
              <TabsTrigger value="unviewed">
                Unviewed
                {stats.unviewed > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.unviewed}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search summaries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No patient summaries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {summary.patient_name || `Patient #${summary.patient_user_id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{summary.title}</p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(summary.summary_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {summary.is_viewed_by_patient ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Viewed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Viewed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewSummary(summary)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSummary(summary)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(summary)}
                              disabled={downloading?.id === summary.id && downloading?.type === "pdf"}
                            >
                              {downloading?.id === summary.id && downloading?.type === "pdf" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileDown className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadWord(summary)}
                              disabled={downloading?.id === summary.id && downloading?.type === "word"}
                            >
                              {downloading?.id === summary.id && downloading?.type === "word" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="unviewed" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        {unviewedSummariesLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        ) : (
                          "All summaries have been viewed by patients"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummaries.map((summary) => (
                      <TableRow key={summary.id} className="bg-orange-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {summary.patient_name || `Patient #${summary.patient_user_id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{summary.title}</p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(summary.summary_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewSummary(summary)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditSummary(summary)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(summary)}
                              disabled={downloading?.id === summary.id && downloading?.type === "pdf"}
                            >
                              {downloading?.id === summary.id && downloading?.type === "pdf" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileDown className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadWord(summary)}
                              disabled={downloading?.id === summary.id && downloading?.type === "word"}
                            >
                              {downloading?.id === summary.id && downloading?.type === "word" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Summary Details</DialogTitle>
          </DialogHeader>
          {selectedSummary && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold">
                    {selectedSummary.patient_name || `Patient #${selectedSummary.patient_user_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="font-semibold">{selectedSummary.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {format(new Date(selectedSummary.summary_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {selectedSummary.is_viewed_by_patient ? (
                    <Badge variant="default" className="bg-green-500">
                      Viewed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Not Viewed
                    </Badge>
                  )}
                </div>
                {selectedSummary.is_viewed_by_patient && selectedSummary.viewed_at && (
                  <div>
                    <p className="text-sm text-gray-600">Viewed At</p>
                    <p className="font-semibold">
                      {format(new Date(selectedSummary.viewed_at), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>

              {/* AI Summary */}
              {selectedSummary.ai_generated_summary && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI-Generated Summary</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">
                    {selectedSummary.ai_generated_summary}
                  </p>
                </div>
              )}

              {/* What We Found */}
              {selectedSummary.what_we_found && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">What We Found</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.what_we_found}
                  </p>
                </div>
              )}

              {/* What It Means */}
              {selectedSummary.what_it_means && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">What It Means</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.what_it_means}
                  </p>
                </div>
              )}

              {/* Your Diagnosis */}
              {selectedSummary.your_diagnosis && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Your Diagnosis</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-purple-50 p-4 rounded-lg">
                    {selectedSummary.your_diagnosis}
                  </p>
                </div>
              )}

              {/* Your Treatment Plan */}
              {selectedSummary.your_treatment_plan && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Your Treatment Plan</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.your_treatment_plan}
                  </p>
                </div>
              )}

              {/* Your Medications */}
              {selectedSummary.your_medications && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Your Medications</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.your_medications}
                  </p>
                </div>
              )}

              {/* What to Watch For */}
              {selectedSummary.what_to_watch_for && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">What to Watch For</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-red-50 p-4 rounded-lg">
                    {selectedSummary.what_to_watch_for}
                  </p>
                </div>
              )}

              {/* Next Steps */}
              {selectedSummary.next_steps && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Next Steps</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.next_steps}
                  </p>
                </div>
              )}

              {/* Lifestyle Tips */}
              {selectedSummary.lifestyle_tips && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Lifestyle Tips</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">
                    {selectedSummary.lifestyle_tips}
                  </p>
                </div>
              )}

              {/* Questions to Ask */}
              {selectedSummary.questions_to_ask && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Questions to Ask</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.questions_to_ask}
                  </p>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedSummary.doctor_notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Doctor's Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {selectedSummary.doctor_notes}
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              {selectedSummary.special_instructions && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Special Instructions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg">
                    {selectedSummary.special_instructions}
                  </p>
                </div>
              )}

              {/* E-Signature Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Document Signature</h3>
                <DocumentSignButton
                  documentType="patient-summary"
                  documentId={selectedSummary.id}
                  isSigned={!!selectedSummary.signed_by_doctor_id}
                  signedAt={selectedSummary.doctor_signed_at}
                  signedByName={selectedSummary.signed_by_doctor_name}
                  onSignatureChange={() => {
                    dispatch(fetchRecentPatientSummaries({ limit: 50, offset: 0 }));
                    dispatch(fetchUnviewedPatientSummaries());
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedSummary && (
              <>
                <Button
                  onClick={() => handleDownloadPDF(selectedSummary)}
                  disabled={downloading?.id === selectedSummary.id && downloading?.type === "pdf"}
                  variant="outline"
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
                >
                  {downloading?.id === selectedSummary.id && downloading?.type === "word" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Word
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Patient Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient Search */}
            <div>
              <Label>Search Patient *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={!!selectedPatient}
                />
              </div>

              {/* Selected Patient */}
              {selectedPatient && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900">
                      {selectedPatient.full_name || selectedPatient.name || selectedPatient.patient_name || 'Unknown Patient'}
                    </p>
                    <p className="text-sm text-green-700">
                      {selectedPatient.email || selectedPatient.patient_email || 'No email'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearchTerm("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              )}

              {/* Patient Search Results */}
              {!selectedPatient && patientSearchTerm.length >= 2 && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Searching...
                    </div>
                  ) : patientResults.length > 0 ? (
                    <div>
                      {patientResults.map((patient, index) => (
                        <div
                          key={patient.user_id || patient.id || index}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            console.log('Selected patient:', patient);
                            setSelectedPatient(patient);
                            setPatientSearchTerm("");
                            setPatientResults([]);
                          }}
                        >
                          <p className="font-medium text-sm">
                            {patient.full_name || patient.name || patient.patient_name || 'Unknown Patient'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {patient.email || patient.patient_email || 'No email'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No patients found. Try a different search term.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Summary Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Your Gastritis Visit Summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Doctor Notes */}
            <div>
              <Label htmlFor="doctorNotes">Doctor's Notes (Optional)</Label>
              <Textarea
                id="doctorNotes"
                placeholder="Add any personal notes for the patient..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special instructions for the patient..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The AI will automatically generate patient-friendly content
                including what we found, diagnosis, treatment plan, medications, warning signs,
                next steps, lifestyle tips, and common questions based on the patient's medical records.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateDialog} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSummary}
              disabled={creating || !selectedPatient || !title.trim()}
              className="bg-[#388fe5] hover:bg-[#6fb043]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Summary
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Patient Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editTitle">Summary Title</Label>
              <Input
                id="editTitle"
                placeholder="Summary title..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editDoctorNotes">Doctor's Notes</Label>
              <Textarea
                id="editDoctorNotes"
                placeholder="Add any personal notes..."
                value={editDoctorNotes}
                onChange={(e) => setEditDoctorNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editSpecialInstructions">Special Instructions</Label>
              <Textarea
                id="editSpecialInstructions"
                placeholder="Any special instructions..."
                value={editSpecialInstructions}
                onChange={(e) => setEditSpecialInstructions(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You can only edit the title, doctor's notes, and special
                instructions. AI-generated content cannot be modified.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialog(false);
                setEditingSummary(null);
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSummary}
              disabled={updating}
              className="bg-[#388fe5] hover:bg-[#6fb043]"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Summary
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

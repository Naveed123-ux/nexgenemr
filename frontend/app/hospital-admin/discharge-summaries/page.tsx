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
  FileText,
  Download,
  Eye,
  Search,
  Calendar,
  User,
  FileDown,
  Loader2,
  Plus,
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  fetchHospitalSummaries,
  downloadPDFThunk,
  downloadWordThunk,
  createDischargeSummaryThunk,
  clearErrors,
} from "@/store/slices/dischargeSummarySlice";
import { triggerFileDownload } from "@/app/_apis/dischargeSummaries";
import { fetchAllHospitalPatients } from "@/app/_apis/hospital_Admin/patients";
import DocumentSignButton from "@/components/DocumentSignButton";

export default function HospitalAdminDischargeSummaries() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    hospitalSummaries = [],
    hospitalSummariesLoading = false,
    hospitalSummariesError = null,
    downloading = null,
    downloadError = null,
  } = useSelector((state: RootState) => state.dischargeSummaries || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);

  // Create discharge summary state
  const [createDialog, setCreateDialog] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [admissionDate, setAdmissionDate] = useState("");
  const [dischargeDate, setDischargeDate] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchHospitalSummaries({ limit: 100, offset: 0 }));
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (hospitalSummariesError) {
      toast.error(hospitalSummariesError);
      dispatch(clearErrors());
    }
  }, [hospitalSummariesError, dispatch]);

  useEffect(() => {
    if (downloadError) {
      toast.error(downloadError);
      dispatch(clearErrors());
    }
  }, [downloadError, dispatch]);

  // Load all patients when dialog opens
  useEffect(() => {
    if (createDialog && !patientsLoaded) {
      loadAllPatients();
    }
  }, [createDialog, patientsLoaded]);

  const loadAllPatients = async () => {
    setIsSearching(true);
    try {
      const patients = await fetchAllHospitalPatients();
      setAllPatients(patients);
      setPatientsLoaded(true);
    } catch (error) {
      toast.error("Failed to load patients");
    } finally {
      setIsSearching(false);
    }
  };

  // Filter patients based on search term
  useEffect(() => {
    if (patientSearchTerm.trim().length < 2) {
      setPatientResults([]);
      return;
    }

    const searchLower = patientSearchTerm.toLowerCase();
    const filtered = allPatients.filter(
      (patient) =>
        patient.full_name?.toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower) ||
        patient.phone_number?.includes(patientSearchTerm)
    );
    setPatientResults(filtered);
  }, [patientSearchTerm, allPatients]);

  const loadSummaries = () => {
    dispatch(fetchHospitalSummaries({ limit: 100, offset: 0 }));
  };

  const handleViewSummary = (summary: any) => {
    setSelectedSummary(summary);
    setViewDialog(true);
  };

  const handleDownloadPDF = async (summary: any) => {
    try {
      const result = await dispatch(downloadPDFThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `discharge_summary_${summary.id}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleDownloadWord = async (summary: any) => {
    try {
      const result = await dispatch(downloadWordThunk(summary.id)).unwrap();
      triggerFileDownload(result.blob, `discharge_summary_${summary.id}.docx`);
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
    if (!admissionDate || !dischargeDate) {
      toast.error("Please provide admission and discharge dates");
      return;
    }

    setIsCreating(true);
    try {
      await dispatch(
        createDischargeSummaryThunk({
          patient_user_id: selectedPatient.user_id,
          admission_date: new Date(admissionDate).toISOString(),
          discharge_date: new Date(dischargeDate).toISOString(),
          doctor_notes: doctorNotes || undefined,
          follow_up_instructions: followUpInstructions || undefined,
        })
      ).unwrap();

      toast.success("Discharge summary created successfully!");
      setCreateDialog(false);
      resetCreateForm();
      dispatch(fetchHospitalSummaries({ limit: 100, offset: 0 }));
    } catch (error: any) {
      toast.error(error || "Failed to create discharge summary");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setPatientResults([]);
    setAdmissionDate("");
    setDischargeDate("");
    setDoctorNotes("");
    setFollowUpInstructions("");
  };

  const handleCloseCreateDialog = () => {
    setCreateDialog(false);
    resetCreateForm();
  };

  const filteredSummaries = useMemo(() => {
    if (!searchTerm.trim()) {
      return hospitalSummaries;
    }
    return hospitalSummaries.filter(
      (summary) =>
        summary.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.doctor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.discharge_diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, hospitalSummaries]);

  const stats = useMemo(() => ({
    total: hospitalSummaries.length,
    thisMonth: hospitalSummaries.filter(
      (s) =>
        new Date(s.created_at).getMonth() === new Date().getMonth() &&
        new Date(s.created_at).getFullYear() === new Date().getFullYear()
    ).length,
    uniquePatients: new Set(hospitalSummaries.map((s) => s.patient_user_id)).size,
  }), [hospitalSummaries]);

  if (hospitalSummariesLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Discharge Summaries</h1>
          <p className="text-gray-600 mt-1">Manage patient discharge documentation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialog(true)} className="bg-[#388fe5] hover:bg-[#6fb043]">
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
              <Calendar className="w-6 h-6 text-[#388fe5]" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unique Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniquePatients}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Table */}
      <Card className="p-6 bg-white">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by patient name, doctor, or diagnosis..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredSummaries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="mx-auto h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No discharge summaries found</p>
            <p className="text-sm">Summaries will appear here once created</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Discharge Date</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">
                      {summary.patient_name || `Patient #${summary.patient_user_id}`}
                    </TableCell>
                    <TableCell>
                      {summary.doctor_name || `Doctor #${summary.doctor_user_id}`}
                    </TableCell>
                    <TableCell>
                      {new Date(summary.admission_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(summary.discharge_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">
                        {summary.discharge_diagnosis || "N/A"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewSummary(summary)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(summary)}
                          disabled={
                            downloading?.id === summary.id && downloading?.type === "pdf"
                          }
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
                          disabled={
                            downloading?.id === summary.id && downloading?.type === "word"
                          }
                        >
                          {downloading?.id === summary.id && downloading?.type === "word" ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 mr-1" />
                          )}
                          Word
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

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
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold">
                    {selectedSummary.patient_name || `Patient #${selectedSummary.patient_user_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Doctor</p>
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
                  <p className="text-sm text-gray-600">Discharge Date</p>
                  <p className="font-semibold">
                    {new Date(selectedSummary.discharge_date).toLocaleDateString()}
                  </p>
                </div>
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

              {/* Hospital Course */}
              {selectedSummary.hospital_course && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Hospital Course</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.hospital_course}
                  </p>
                </div>
              )}

              {/* Discharge Diagnosis */}
              {selectedSummary.discharge_diagnosis && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Discharge Diagnosis</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.discharge_diagnosis}
                  </p>
                </div>
              )}

              {/* Medications */}
              {selectedSummary.discharge_medications && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Discharge Medications</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.discharge_medications}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {selectedSummary.discharge_instructions && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Discharge Instructions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.discharge_instructions}
                  </p>
                </div>
              )}

              {/* Follow-up Plan */}
              {selectedSummary.follow_up_plan && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Follow-up Plan</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSummary.follow_up_plan}
                  </p>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedSummary.doctor_notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Doctor Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg">
                    {selectedSummary.doctor_notes}
                  </p>
                </div>
              )}

              {/* E-Signature Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Document Signature</h3>
                <DocumentSignButton
                  documentType="discharge-summary"
                  documentId={selectedSummary.id}
                  isSigned={!!selectedSummary.signed_by_admin_id || !!selectedSummary.signed_by_doctor_id || !!selectedSummary.signed_by_staff_id}
                  signedAt={selectedSummary.admin_signed_at || selectedSummary.doctor_signed_at || selectedSummary.staff_signed_at}
                  signedByName={selectedSummary.signed_by_admin_name || selectedSummary.signed_by_doctor_name || selectedSummary.signed_by_staff_name}
                  onSignatureChange={() => {
                    dispatch(fetchHospitalSummaries({ limit: 100, offset: 0 }));
                  }}
                />
              </div>
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

      {/* Create Discharge Summary Dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => !open && handleCloseCreateDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Discharge Summary</DialogTitle>
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
                    <p className="font-semibold text-green-900">{selectedPatient.full_name}</p>
                    <p className="text-sm text-green-700">{selectedPatient.email}</p>
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
                      {patientResults.map((patient) => (
                        <div
                          key={patient.user_id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientSearchTerm("");
                            setPatientResults([]);
                          }}
                        >
                          <p className="font-medium text-sm">{patient.full_name}</p>
                          <p className="text-xs text-gray-500">{patient.email}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No patients found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admission Date */}
            <div>
              <Label htmlFor="admissionDate">Admission Date *</Label>
              <Input
                id="admissionDate"
                type="datetime-local"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Discharge Date */}
            <div>
              <Label htmlFor="dischargeDate">Discharge Date *</Label>
              <Input
                id="dischargeDate"
                type="datetime-local"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Doctor Notes */}
            <div>
              <Label htmlFor="doctorNotes">Doctor Notes (Optional)</Label>
              <Textarea
                id="doctorNotes"
                placeholder="Enter any additional notes..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Follow-up Instructions */}
            <div>
              <Label htmlFor="followUpInstructions">Follow-up Instructions (Optional)</Label>
              <Textarea
                id="followUpInstructions"
                placeholder="Enter follow-up instructions..."
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The AI will automatically generate the hospital course,
                discharge diagnosis, medications, instructions, and follow-up plan based on the
                patient's medical records.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCreateDialog}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSummary}
              disabled={isCreating || !selectedPatient || !admissionDate || !dischargeDate}
              className="bg-[#388fe5] hover:bg-[#6fb043]"
            >
              {isCreating ? (
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
    </div>
  );
}

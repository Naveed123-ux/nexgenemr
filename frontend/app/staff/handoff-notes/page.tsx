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
} from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { format } from "date-fns";
import DocumentSignButton from "@/components/DocumentSignButton";
import {
  fetchRecentHandoffNotes,
  fetchUnacknowledgedHandoffNotes,
  createHandoffNoteThunk,
  updateHandoffNoteThunk,
  acknowledgeHandoffNoteThunk,
  downloadPDFThunk,
  clearErrors,
} from "@/store/slices/handoffNoteSlice";
import { triggerFileDownload } from "@/app/_apis/handoffNotes";
import { fetchAllHospitalPatients } from "@/app/_apis/hospital_Admin/patients";

export default function StaffHandoffNotes() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    recentNotes = [],
    recentNotesLoading = false,
    recentNotesError = null,
    unacknowledgedNotes = [],
    unacknowledgedNotesLoading = false,
    unacknowledgedNotesError = null,
    creating = false,
    createError = null,
    updating = false,
    updateError = null,
    acknowledging = null,
    acknowledgeError = null,
    downloading = null,
    downloadError = null,
  } = useSelector((state: RootState) => state.handoffNotes || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Create handoff note state
  const [createDialog, setCreateDialog] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [shiftFrom, setShiftFrom] = useState("");
  const [shiftTo, setShiftTo] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Edit state
  const [editDialog, setEditDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editAdditionalNotes, setEditAdditionalNotes] = useState("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState("");

  useEffect(() => {
    dispatch(fetchRecentHandoffNotes(100));
    dispatch(fetchUnacknowledgedHandoffNotes());
  }, [dispatch]);

  // Handle errors
  useEffect(() => {
    if (recentNotesError) {
      toast.error(recentNotesError);
      dispatch(clearErrors());
    }
  }, [recentNotesError, dispatch]);

  useEffect(() => {
    if (unacknowledgedNotesError) {
      toast.error(unacknowledgedNotesError);
      dispatch(clearErrors());
    }
  }, [unacknowledgedNotesError, dispatch]);

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
    if (acknowledgeError) {
      toast.error(acknowledgeError);
      dispatch(clearErrors());
    }
  }, [acknowledgeError, dispatch]);

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

  const loadNotes = () => {
    dispatch(fetchRecentHandoffNotes(100));
    dispatch(fetchUnacknowledgedHandoffNotes());
  };

  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setViewDialog(true);
  };

  const handleDownloadPDF = async (note: any) => {
    try {
      const result = await dispatch(downloadPDFThunk(note.id)).unwrap();
      triggerFileDownload(result.blob, `handoff_note_${note.id}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleAcknowledge = async (noteId: number) => {
    try {
      await dispatch(acknowledgeHandoffNoteThunk(noteId)).unwrap();
      toast.success("Handoff note acknowledged successfully");
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleCreateNote = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!shiftFrom || !shiftTo) {
      toast.error("Please provide shift information");
      return;
    }

    try {
      await dispatch(
        createHandoffNoteThunk({
          patient_user_id: selectedPatient.user_id,
          shift_from: shiftFrom,
          shift_to: shiftTo,
          additional_notes: additionalNotes || undefined,
          special_instructions: specialInstructions || undefined,
        })
      ).unwrap();

      toast.success("Handoff note created successfully!");
      setCreateDialog(false);
      resetCreateForm();
      dispatch(fetchRecentHandoffNotes(100));
      dispatch(fetchUnacknowledgedHandoffNotes());
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setEditAdditionalNotes(note.additional_notes || "");
    setEditSpecialInstructions(note.special_instructions || "");
    setEditDialog(true);
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    try {
      await dispatch(
        updateHandoffNoteThunk({
          noteId: editingNote.id,
          data: {
            additional_notes: editAdditionalNotes || undefined,
            special_instructions: editSpecialInstructions || undefined,
          },
        })
      ).unwrap();

      toast.success("Handoff note updated successfully!");
      setEditDialog(false);
      setEditingNote(null);
    } catch (error: any) {
      // Error handled in useEffect
    }
  };

  const resetCreateForm = () => {
    setSelectedPatient(null);
    setPatientSearchTerm("");
    setPatientResults([]);
    setShiftFrom("");
    setShiftTo("");
    setAdditionalNotes("");
    setSpecialInstructions("");
  };

  const handleCloseCreateDialog = () => {
    setCreateDialog(false);
    resetCreateForm();
  };

  const filteredNotes = useMemo(() => {
    const notes = activeTab === "unacknowledged" ? unacknowledgedNotes : recentNotes;
    if (!searchTerm.trim()) {
      return notes;
    }
    return notes.filter(
      (note) =>
        note.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.shift_from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.shift_to?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, recentNotes, unacknowledgedNotes, activeTab]);

  const stats = useMemo(
    () => ({
      total: recentNotes.length,
      unacknowledged: unacknowledgedNotes.length,
      acknowledged: recentNotes.filter((n) => n.is_acknowledged).length,
      today: recentNotes.filter(
        (n) =>
          new Date(n.handoff_date).toDateString() === new Date().toDateString()
      ).length,
    }),
    [recentNotes, unacknowledgedNotes]
  );

  if (recentNotesLoading && recentNotes.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Handoff Notes</h1>
          <p className="text-gray-600 mt-1">Manage patient handoff documentation</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateDialog(true)}
            className="bg-[#388fe5] hover:bg-[#6fb043]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Handoff Note
          </Button>
          <Button onClick={loadNotes} variant="outline">
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
              <p className="text-sm text-gray-600">Total Notes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Unacknowledged</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unacknowledged}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-[#388fe5]" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Acknowledged</p>
              <p className="text-2xl font-bold text-gray-900">{stats.acknowledged}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Card className="p-6 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="all">All Notes</TabsTrigger>
              <TabsTrigger value="unacknowledged">
                Unacknowledged
                {stats.unacknowledged > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {stats.unacknowledged}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search notes..."
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
                    <TableHead>Created By</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No handoff notes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {note.patient_name || `Patient #${note.patient_user_id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {note.staff_name || `Staff #${note.created_by_staff_id}`}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-gray-600">{note.shift_from}</p>
                            <p className="text-gray-400">→ {note.shift_to}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(note.handoff_date), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {note.is_acknowledged ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewNote(note)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!note.is_acknowledged && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNote(note)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAcknowledge(note.id)}
                                  disabled={acknowledging === note.id}
                                >
                                  {acknowledging === note.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(note)}
                              disabled={downloading === note.id}
                            >
                              {downloading === note.id ? (
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

          <TabsContent value="unacknowledged" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {unacknowledgedNotesLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        ) : (
                          "No unacknowledged handoff notes"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotes.map((note) => (
                      <TableRow key={note.id} className="bg-red-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {note.patient_name || `Patient #${note.patient_user_id}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {note.staff_name || `Staff #${note.created_by_staff_id}`}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-gray-600">{note.shift_from}</p>
                            <p className="text-gray-400">→ {note.shift_to}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(note.handoff_date), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewNote(note)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditNote(note)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAcknowledge(note.id)}
                              disabled={acknowledging === note.id}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              {acknowledging === note.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Acknowledge
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownloadPDF(note)}
                              disabled={downloading === note.id}
                            >
                              {downloading === note.id ? (
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
            <DialogTitle>Handoff Note Details</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold">
                    {selectedNote.patient_name || `Patient #${selectedNote.patient_user_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-semibold">
                    {selectedNote.staff_name || `Staff #${selectedNote.created_by_staff_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shift From</p>
                  <p className="font-semibold">{selectedNote.shift_from}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shift To</p>
                  <p className="font-semibold">{selectedNote.shift_to}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Handoff Date</p>
                  <p className="font-semibold">
                    {format(new Date(selectedNote.handoff_date), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {selectedNote.is_acknowledged ? (
                    <Badge variant="default" className="bg-green-500">
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Pending</Badge>
                  )}
                </div>
                {selectedNote.is_acknowledged && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Acknowledged By</p>
                      <p className="font-semibold">
                        {selectedNote.acknowledged_by_name ||
                          `Staff #${selectedNote.acknowledged_by_staff_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Acknowledged At</p>
                      <p className="font-semibold">
                        {format(new Date(selectedNote.acknowledged_at), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* AI Summary */}
              {selectedNote.ai_generated_summary && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI-Generated Summary</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">
                    {selectedNote.ai_generated_summary}
                  </p>
                </div>
              )}

              {/* Patient Overview */}
              {selectedNote.patient_overview && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Patient Overview</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.patient_overview}
                  </p>
                </div>
              )}

              {/* Current Condition */}
              {selectedNote.current_condition && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Current Condition</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.current_condition}
                  </p>
                </div>
              )}

              {/* Active Problems */}
              {selectedNote.active_problems && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Active Problems</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.active_problems}
                  </p>
                </div>
              )}

              {/* Recent Changes */}
              {selectedNote.recent_changes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Recent Changes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.recent_changes}
                  </p>
                </div>
              )}

              {/* Current Medications */}
              {selectedNote.current_medications && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Current Medications</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.current_medications}
                  </p>
                </div>
              )}

              {/* Pending Tasks */}
              {selectedNote.pending_tasks && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Pending Tasks</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg">
                    {selectedNote.pending_tasks}
                  </p>
                </div>
              )}

              {/* Important Alerts */}
              {selectedNote.important_alerts && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Important Alerts</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-red-50 p-4 rounded-lg">
                    {selectedNote.important_alerts}
                  </p>
                </div>
              )}

              {/* Care Plan */}
              {selectedNote.care_plan && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Care Plan</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.care_plan}
                  </p>
                </div>
              )}

              {/* Family Communication */}
              {selectedNote.family_communication && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Family Communication</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedNote.family_communication}
                  </p>
                </div>
              )}

              {/* Additional Notes */}
              {selectedNote.additional_notes && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Additional Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {selectedNote.additional_notes}
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              {selectedNote.special_instructions && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Special Instructions</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 p-4 rounded-lg">
                    {selectedNote.special_instructions}
                  </p>
                </div>
              )}

              {/* E-Signature Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3">Document Signature</h3>
                <DocumentSignButton
                  documentType="handoff-note"
                  documentId={selectedNote.id}
                  isSigned={!!selectedNote.signed_by_staff_id}
                  signedAt={selectedNote.staff_signed_at}
                  signedByName={selectedNote.signed_by_staff_name}
                  onSignatureChange={() => {
                    dispatch(fetchRecentHandoffNotes({ limit: 50, offset: 0 }));
                    dispatch(fetchUnacknowledgedHandoffNotes());
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedNote && (
              <>
                {!selectedNote.is_acknowledged && (
                  <Button
                    onClick={() => {
                      handleAcknowledge(selectedNote.id);
                      setViewDialog(false);
                    }}
                    disabled={acknowledging === selectedNote.id}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {acknowledging === selectedNote.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Acknowledge
                  </Button>
                )}
                <Button
                  onClick={() => handleDownloadPDF(selectedNote)}
                  disabled={downloading === selectedNote.id}
                  variant="outline"
                >
                  {downloading === selectedNote.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
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
            <DialogTitle>Create Handoff Note</DialogTitle>
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

            {/* Shift From */}
            <div>
              <Label htmlFor="shiftFrom">Shift From *</Label>
              <Input
                id="shiftFrom"
                placeholder="e.g., Day Shift, 7AM-3PM"
                value={shiftFrom}
                onChange={(e) => setShiftFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Shift To */}
            <div>
              <Label htmlFor="shiftTo">Shift To *</Label>
              <Input
                id="shiftTo"
                placeholder="e.g., Night Shift, 3PM-11PM"
                value={shiftTo}
                onChange={(e) => setShiftTo(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Enter any additional notes..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Enter special instructions..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The AI will automatically generate patient overview, current
                condition, active problems, medications, pending tasks, alerts, care plan, and family
                communication based on the patient's medical records.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreateDialog} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={creating || !selectedPatient || !shiftFrom || !shiftTo}
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
                  Create Handoff Note
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
            <DialogTitle>Edit Handoff Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAdditionalNotes">Additional Notes</Label>
              <Textarea
                id="editAdditionalNotes"
                placeholder="Enter any additional notes..."
                value={editAdditionalNotes}
                onChange={(e) => setEditAdditionalNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editSpecialInstructions">Special Instructions</Label>
              <Textarea
                id="editSpecialInstructions"
                placeholder="Enter special instructions..."
                value={editSpecialInstructions}
                onChange={(e) => setEditSpecialInstructions(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialog(false);
                setEditingNote(null);
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateNote}
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
                  Update Note
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

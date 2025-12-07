"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Loader2, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  Users,
  AlertCircle,
  Clock,
  Filter
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { privateApi } from "@/lib/axios";

interface WaitlistManagementPanelProps {
  doctorId?: number;
  patientId?: number;
}

interface WaitlistEntry {
  id: number;
  patient_profile_id: number;
  doctor_user_id: number;
  priority: "normal" | "high";
  preferred_days: string[];
  notes: string | null;
  status: "pending" | "invited" | "booked" | "cancelled" | "expired";
  expiry_date: string;
  created_at: string;
  updated_at: string | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone_number: string | null;
  };
  doctor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

interface Patient {
  profile_id: number;
  user_id: number;
  full_name: string;
  email: string;
  status: boolean;
  assigned_doctor_id: number | null;
}

interface Doctor {
  user_id: number;
  profile_id: number;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  department_name: string;
  profile_picture_url: string | null;
}

interface AssociatedDoctor {
  user_id: number;
  full_name: string;
  email: string;
  specialization: string;
  department_name: string | null;
  profile_picture_url: string | null;
  is_assigned_doctor: boolean;
  relationship_type: "assigned" | "appointment_history";
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function WaitlistManagementPanel({ doctorId, patientId }: WaitlistManagementPanelProps) {
  // State for form
  // Note: patientId prop is user_id, we'll convert to profile_id in loadPatients
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientProfileId, setPatientProfileId] = useState<number | null>(null); // Store profile_id separately
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctorId || null);
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isAnytime, setIsAnytime] = useState(false);
  const [notes, setNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default +30 days
  );

  // State for lists
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // State for UI
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalPending: 0,
    highPriorityCount: 0
  });

  useEffect(() => {
    loadInitialData();
  }, [doctorId, patientId]);
  
  // Load waitlist entries when we have the profile ID
  useEffect(() => {
    if (patientProfileId && !doctorId) {
      loadPatientWaitlistEntries(patientProfileId);
    }
  }, [patientProfileId]);
  
  // Load waitlist entries when assigned doctor is selected
  useEffect(() => {
    if (selectedDoctorId && !doctorId) {
      loadWaitlistEntries(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    calculateStats();
  }, [waitlistEntries]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPatients(),
        loadDoctors(),
        doctorId ? loadWaitlistEntries(doctorId) : Promise.resolve()
      ]);
      // Note: Patient waitlist entries will be loaded by the useEffect when patientProfileId is set
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const response = await privateApi.get("/patients");
      const patientsData = response.data || [];
      setPatients(patientsData);
      
      // If viewing from patient page, patientId is the user_id, not profile_id
      if (patientId) {
        const currentPatient = patientsData.find((p: Patient) => p.user_id === patientId);
        if (currentPatient) {
          // Set the selected patient to the profile_id
          setSelectedPatientId(currentPatient.profile_id);
          setPatientProfileId(currentPatient.profile_id);
          
          // Pre-select the assigned doctor if available
          if (currentPatient.assigned_doctor_id && !doctorId) {
            setSelectedDoctorId(currentPatient.assigned_doctor_id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load patients:", error);
      setPatients([]);
    }
  };

  const loadDoctors = async () => {
    try {
      // If viewing from patient page, use the new associated doctors endpoint
      if (patientId) {
        const response = await privateApi.get(`/patients/${patientId}/doctors`);
        const associatedDoctors: AssociatedDoctor[] = response.data || [];
        
        // Convert AssociatedDoctor to Doctor format
        const doctorsFormatted = associatedDoctors.map((doc: AssociatedDoctor) => {
          const nameParts = doc.full_name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            user_id: doc.user_id,
            profile_id: doc.user_id, // Using user_id as profile_id
            first_name: firstName,
            last_name: lastName,
            email: doc.email,
            specialization: doc.specialization,
            department_name: doc.department_name || '',
            profile_picture_url: doc.profile_picture_url,
            is_assigned_doctor: doc.is_assigned_doctor,
            relationship_type: doc.relationship_type
          };
        });
        
        setDoctors(doctorsFormatted);
        
        // Auto-select the assigned doctor if available
        const assignedDoctor = associatedDoctors.find(d => d.is_assigned_doctor);
        if (assignedDoctor && !selectedDoctorId) {
          setSelectedDoctorId(assignedDoctor.user_id);
        }
      } else {
        // Not viewing from patient page, show all doctors
        const response = await privateApi.get("/doctors");
        setDoctors(response.data.doctors || []);
      }
    } catch (error) {
      console.error("Failed to load doctors:", error);
      toast.error("Failed to load doctors for this patient");
      setDoctors([]);
    }
  };

  const loadWaitlistEntries = async (doctorUserId: number) => {
    try {
      const response = await privateApi.get(`/api/waitlist/doctors/${doctorUserId}/entries`);
      setWaitlistEntries(response.data);
    } catch (error) {
      console.error("Failed to load waitlist entries:", error);
    }
  };

  const loadPatientWaitlistEntries = async (patientProfileId: number) => {
    try {
      const response = await privateApi.get(`/api/waitlist/patients/${patientProfileId}/entries`);
      setWaitlistEntries(response.data);
    } catch (error) {
      console.error("Failed to load patient waitlist entries:", error);
      toast.error("Failed to load patient waitlist entries");
    }
  };

  const calculateStats = () => {
    const pending = waitlistEntries.filter(e => e.status === "pending");
    const highPriority = pending.filter(e => e.priority === "high");
    
    setStats({
      totalPending: pending.length,
      highPriorityCount: highPriority.length
    });
  };

  const handleDayToggle = (day: string) => {
    if (isAnytime) return;
    
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleAnytimeToggle = (checked: boolean) => {
    setIsAnytime(checked);
    if (checked) {
      setSelectedDays([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatientId || !selectedDoctorId) {
      toast.error("Please select both patient and doctor");
      return;
    }

    if (!isAnytime && selectedDays.length === 0) {
      toast.error("Please select at least one day or choose 'Anytime'");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_profile_id: selectedPatientId,
        doctor_user_id: selectedDoctorId,
        priority,
        preferred_days: isAnytime ? ["Anytime"] : selectedDays,
        notes: notes.trim() || null,
        expiry_date: expiryDate ? format(expiryDate, "yyyy-MM-dd") : null
      };

      await privateApi.post("/api/waitlist/entries", payload);
      toast.success("Patient added to waitlist");
      
      // Reset form
      if (!patientId) setSelectedPatientId(null);
      if (!doctorId) setSelectedDoctorId(null);
      setPriority("normal");
      setSelectedDays([]);
      setIsAnytime(false);
      setNotes("");
      setExpiryDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      // Reload entries
      if (selectedDoctorId) {
        await loadWaitlistEntries(selectedDoctorId);
      } else if (patientProfileId) {
        await loadPatientWaitlistEntries(patientProfileId);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to add to waitlist";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: WaitlistEntry) => {
    setEditingEntry(entry);
    setShowEditDialog(true);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    setSubmitting(true);
    try {
      const payload: any = {};
      
      // Only include changed fields
      if (editingEntry.priority) payload.priority = editingEntry.priority;
      if (editingEntry.preferred_days) payload.preferred_days = editingEntry.preferred_days;
      if (editingEntry.notes !== null) payload.notes = editingEntry.notes;
      if (editingEntry.expiry_date) payload.expiry_date = editingEntry.expiry_date;

      await privateApi.patch(`/api/waitlist/entries/${editingEntry.id}`, payload);
      toast.success("Waitlist entry updated");
      
      setShowEditDialog(false);
      setEditingEntry(null);

      // Reload entries
      if (selectedDoctorId) {
        await loadWaitlistEntries(selectedDoctorId);
      } else if (patientProfileId) {
        await loadPatientWaitlistEntries(patientProfileId);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to update entry";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (entryId: number) => {
    if (!confirm("Are you sure you want to remove this patient from the waitlist?")) {
      return;
    }

    try {
      await privateApi.delete(`/api/waitlist/entries/${entryId}`);
      toast.success("Patient removed from waitlist");
      
      // Reload entries
      if (selectedDoctorId) {
        await loadWaitlistEntries(selectedDoctorId);
      } else if (patientProfileId) {
        await loadPatientWaitlistEntries(patientProfileId);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to remove entry";
      toast.error(message);
    }
  };

  const handleDoctorChange = async (doctorUserId: string) => {
    const id = parseInt(doctorUserId);
    setSelectedDoctorId(id);
    await loadWaitlistEntries(id);
  };

  const filteredEntries = waitlistEntries.filter(entry => {
    if (statusFilter !== "all" && entry.status !== statusFilter) return false;
    if (priorityFilter !== "all" && entry.priority !== priorityFilter) return false;
    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "invited": return "bg-blue-100 text-blue-800";
      case "booked": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    return priority === "high" 
      ? "bg-red-100 text-red-800" 
      : "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold">{stats.totalPending}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold">{stats.highPriorityCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Add to Waitlist</TabsTrigger>
          <TabsTrigger value="manage">Manage Waitlist</TabsTrigger>
        </TabsList>

        {/* Add to Waitlist Tab */}
        <TabsContent value="add">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Only show patient selector if NOT viewing from patient page */}
              {!patientId && (
                <div className="space-y-2">
                  <Label htmlFor="patient">Patient *</Label>
                  <Select
                    value={selectedPatientId?.toString() || ""}
                    onValueChange={(value) => setSelectedPatientId(parseInt(value))}
                  >
                    <SelectTrigger id="patient">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.profile_id} value={patient.profile_id.toString()}>
                          {patient.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Doctor Selector */}
              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor *</Label>
                <Select
                  value={selectedDoctorId?.toString() || ""}
                  onValueChange={handleDoctorChange}
                  disabled={!!doctorId}
                >
                  <SelectTrigger id="doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => {
                      const isAssigned = (doctor as any).is_assigned_doctor === true;
                      return (
                        <SelectItem key={doctor.user_id} value={doctor.user_id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>Dr. {doctor.first_name} {doctor.last_name}</span>
                            {isAssigned && (
                              <Badge variant="secondary" className="text-xs">
                                Assigned
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {patientId && doctors.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Showing {doctors.length} associated doctor{doctors.length !== 1 ? 's' : ''} for this patient
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Days */}
              <div className="space-y-2">
                <Label>Preferred Days *</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="anytime"
                      checked={isAnytime}
                      onCheckedChange={handleAnytimeToggle}
                    />
                    <Label htmlFor="anytime" className="font-normal cursor-pointer">
                      Anytime (Any day of the week)
                    </Label>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={selectedDays.includes(day)}
                          onCheckedChange={() => handleDayToggle(day)}
                          disabled={isAnytime}
                        />
                        <Label 
                          htmlFor={day} 
                          className={`font-normal cursor-pointer ${isAnytime ? 'text-gray-400' : ''}`}
                        >
                          {day}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any special notes or preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">
                  Default is 30 days from today
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Waitlist
                  </>
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* Manage Waitlist Tab */}
        <TabsContent value="manage">
          <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm">Filters:</Label>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Waitlist Entries */}
            {!selectedDoctorId && !patientId ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Please select a doctor to view their waitlist</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No waitlist entries found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">
                            {entry.patient?.first_name} {entry.patient?.last_name}
                          </h4>
                          <Badge className={getPriorityBadgeColor(entry.priority)}>
                            {entry.priority}
                          </Badge>
                          <Badge className={getStatusBadgeColor(entry.status)}>
                            {entry.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          {entry.patient?.phone_number && (
                            <p>📞 {entry.patient.phone_number}</p>
                          )}
                          <p>
                            📅 Preferred: {entry.preferred_days.join(", ")}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {format(new Date(entry.expiry_date), "PPP")}
                          </p>
                          {entry.notes && (
                            <p className="text-gray-700 italic">Note: {entry.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Added {format(new Date(entry.created_at), "PPP")}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(entry)}
                          disabled={entry.status !== "pending"}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(entry.id)}
                          disabled={entry.status === "booked" || entry.status === "cancelled"}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Waitlist Entry</DialogTitle>
          </DialogHeader>
          
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editingEntry.priority}
                  onValueChange={(value: any) => 
                    setEditingEntry({ ...editingEntry, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${day}`}
                        checked={editingEntry.preferred_days.includes(day)}
                        onCheckedChange={(checked) => {
                          const newDays = checked
                            ? [...editingEntry.preferred_days, day]
                            : editingEntry.preferred_days.filter(d => d !== day);
                          setEditingEntry({ ...editingEntry, preferred_days: newDays });
                        }}
                      />
                      <Label htmlFor={`edit-${day}`} className="font-normal cursor-pointer">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingEntry.notes || ""}
                  onChange={(e) => 
                    setEditingEntry({ ...editingEntry, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={editingEntry.expiry_date}
                  onChange={(e) => 
                    setEditingEntry({ ...editingEntry, expiry_date: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

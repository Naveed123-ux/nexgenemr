"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchHospitalPatients } from "@/store/slices/hospitalPatientsSlice";
import { fetchBills, generateBill, updateBill, deleteBill, fetchBillDetails } from "@/app/_apis/rcm/bills";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Bill, BillItem, HospitalPatient } from "@/hooks/types/types";
import {
  FileText,
  Users,
  DollarSign,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function BillingManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [generateDialog, setGenerateDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; bill: Bill | null }>({
    open: false,
    bill: null
  });
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; bill: Bill | null }>({
    open: false,
    bill: null
  });

  // Form states
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [generateNotes, setGenerateNotes] = useState("");
  const [updateStatus, setUpdateStatus] = useState<"pending" | "paid" | "overdue" | "cancelled">("pending");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateDueDate, setUpdateDueDate] = useState("");

  // Loading states
  const [generatingBill, setGeneratingBill] = useState(false);
  const [updatingBill, setUpdatingBill] = useState(false);
  const [deletingBill, setDeletingBill] = useState<number | null>(null);

  // Get self-pay patients from Redux
  const { patients } = useSelector((state: RootState) => state.hospitalPatients);

  // Filter self-pay patients only
  const selfPayPatients = useMemo(() => {
    return patients.filter(patient => patient.billing_type === "Self-Pay");
  }, [patients]);

  // Filter patients based on search term
  const filteredSelfPayPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) {
      return selfPayPatients;
    }
    const searchLower = patientSearchTerm.toLowerCase();
    return selfPayPatients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower)
    );
  }, [selfPayPatients, patientSearchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = bills.length;
    const pending = bills.filter(b => b.status === "pending").length;
    const paid = bills.filter(b => b.status === "paid").length;
    const overdue = bills.filter(b => b.status === "overdue").length;
    const totalAmount = bills.reduce((sum, b) => sum + b.total_amount, 0);
    const paidAmount = bills.reduce((sum, b) => sum + b.paid_amount, 0);
    const outstandingAmount = bills.reduce((sum, b) => sum + b.outstanding_amount, 0);

    return { total, pending, paid, overdue, totalAmount, paidAmount, outstandingAmount };
  }, [bills]);

  // Fetch bills and patients on mount
  useEffect(() => {
    loadBills();
    dispatch(fetchHospitalPatients());
  }, [dispatch]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await fetchBills();
      setBills(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    setGeneratingBill(true);
    try {
      const newBill = await generateBill({
        patient_user_id: selectedPatient,
        notes: generateNotes || undefined,
      });

      toast.success(`Bill ${newBill.bill_number} generated successfully!`);
      setGenerateDialog(false);
      setSelectedPatient(null);
      setPatientSearchTerm("");
      setGenerateNotes("");
      loadBills();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate bill");
    } finally {
      setGeneratingBill(false);
    }
  };

  const handleViewBill = async (billId: number) => {
    try {
      const billDetails = await fetchBillDetails(billId);
      setViewDialog({ open: true, bill: billDetails });
    } catch (error: any) {
      toast.error(error.message || "Failed to load bill details");
    }
  };

  const handleUpdateBill = async () => {
    if (!updateDialog.bill) return;

    setUpdatingBill(true);
    try {
      await updateBill(updateDialog.bill.id, {
        status: updateStatus,
        notes: updateNotes || undefined,
        due_date: updateDueDate || undefined,
      });

      toast.success("Bill updated successfully!");
      setUpdateDialog({ open: false, bill: null });
      loadBills();
    } catch (error: any) {
      toast.error(error.message || "Failed to update bill");
    } finally {
      setUpdatingBill(false);
    }
  };

  const handleDeleteBill = async (billId: number) => {
    if (!confirm("Are you sure you want to delete this bill? This action cannot be undone.")) {
      return;
    }

    setDeletingBill(billId);
    try {
      await deleteBill(billId);
      toast.success("Bill deleted successfully!");
      loadBills();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete bill");
    } finally {
      setDeletingBill(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">PENDING</Badge>;
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">PAID</Badge>;
      case "overdue":
        return <Badge variant="destructive">OVERDUE</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 mt-16">
      {/* Header */}
      <header>
        <div className="mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button className="text-sm font-medium text-foreground border-b-2 border-foreground pb-4">
                Billing Management
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Self-Pay Patient Billing
            </h1>
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate and manage bills for self-pay patients
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Bills
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">All Bills</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Pending
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Awaiting Payment</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Outstanding
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">${stats.outstandingAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Amount Due</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Paid
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">${stats.paidAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Collected</p>
            </div>
          </Card>
        </div>

        {/* Bills Table */}
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                All Bills
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={loadBills}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => setGenerateDialog(true)}
                  className="bg-[#388fe5] hover:bg-[#6fb043] text-white gap-2"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Generate Bill
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by bill number or patient name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <InfinitySpin width="200" color="#388fe5" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No bills found</p>
              <p className="text-sm">Generate bills for self-pay patients to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Bill Number
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Patient
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Total Amount
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Paid
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Outstanding
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm text-foreground font-medium">
                        {bill.bill_number}
                      </td>
                      <td className="py-3 px-3 text-sm text-foreground">
                        {bill.patient_name}
                      </td>
                      <td className="py-3 px-3 text-sm text-foreground">
                        ${bill.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-sm text-foreground">
                        ${bill.paid_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-sm text-foreground font-semibold">
                        ${bill.outstanding_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(bill.status)}
                      </td>
                      <td className="py-3 px-3 text-sm text-foreground">
                        {new Date(bill.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewBill(bill.id)}
                            className="text-xs h-8"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUpdateDialog({ open: true, bill });
                              setUpdateStatus(bill.status);
                              setUpdateNotes(bill.notes || "");
                              setUpdateDueDate(bill.due_date.split('T')[0]);
                            }}
                            className="text-xs h-8"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBill(bill.id)}
                            disabled={deletingBill === bill.id || bill.status === "paid"}
                            className="text-xs h-8 text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingBill === bill.id ? (
                              <InfinitySpin width="12" color="#dc2626" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Generate Bill Dialog */}
      <Dialog
        open={generateDialog}
        onOpenChange={(open) => {
          setGenerateDialog(open);
          if (!open) {
            setSelectedPatient(null);
            setPatientSearchTerm("");
            setGenerateNotes("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Search Self-Pay Patient
                {selfPayPatients.length > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({selfPayPatients.length} available)
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Patient Results */}
              {!selectedPatient && (
                <div className="mt-2 max-h-60 overflow-y-auto border rounded-md bg-white">
                  {selfPayPatients.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <p className="font-medium">No self-pay patients available</p>
                      <p className="text-xs mt-1">Make sure patients are loaded and have billing type set to "Self-Pay"</p>
                    </div>
                  ) : filteredSelfPayPatients.length > 0 ? (
                    <div className="divide-y">
                      {filteredSelfPayPatients.map((patient) => (
                        <div
                          key={patient.user_id}
                          onClick={() => {
                            setSelectedPatient(patient.user_id);
                            setPatientSearchTerm(patient.full_name);
                          }}
                          className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{patient.full_name}</p>
                              <p className="text-xs text-gray-600">{patient.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <p>No patients found matching "{patientSearchTerm}"</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Patient Display */}
              {selectedPatient && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {selfPayPatients.find(p => p.user_id === selectedPatient)?.full_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {selfPayPatients.find(p => p.user_id === selectedPatient)?.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearchTerm("");
                      }}
                      className="text-xs"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes for this bill..."
                value={generateNotes}
                onChange={(e) => setGenerateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateBill}
              disabled={generatingBill || !selectedPatient}
              className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
            >
              {generatingBill ? <InfinitySpin width="16" color="#ffffff" /> : "Generate Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, bill: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {viewDialog.bill && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bill Number</p>
                  <p className="font-semibold">{viewDialog.bill.bill_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewDialog.bill.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-semibold">{viewDialog.bill.patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hospital</p>
                  <p className="font-semibold">{viewDialog.bill.hospital_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-semibold">{new Date(viewDialog.bill.issue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-semibold">{new Date(viewDialog.bill.due_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Bill Items</h3>
                <div className="space-y-3">
                  {viewDialog.bill.bill_items?.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.icd_code} - {item.icd_description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Service Date: {new Date(item.service_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${item.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">${viewDialog.bill.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid Amount:</span>
                    <span className="font-semibold text-[#388fe5]">${viewDialog.bill.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Outstanding:</span>
                    <span className="font-bold text-red-600">${viewDialog.bill.outstanding_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {viewDialog.bill.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{viewDialog.bill.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Bill Dialog */}
      <Dialog open={updateDialog.open} onOpenChange={(open) => setUpdateDialog({ open, bill: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Bill</DialogTitle>
          </DialogHeader>
          {updateDialog.bill && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  className="w-full border rounded-md p-2 text-sm"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Due Date</label>
                <Input
                  type="date"
                  value={updateDueDate}
                  onChange={(e) => setUpdateDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  placeholder="Add notes..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialog({ open: false, bill: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBill}
              disabled={updatingBill}
              className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
            >
              {updatingBill ? <InfinitySpin width="16" color="#ffffff" /> : "Update Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

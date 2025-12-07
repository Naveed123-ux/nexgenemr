"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  fetchHospitalInvoicesThunk,
  fetchHospitalInvoiceDetails,
  downloadHospitalInvoiceThunk,
  generateInvoiceThunk,
  clearSelectedInvoice,
  clearErrors
} from "@/store/slices/invoiceSlice";
import { triggerDownload, Invoice } from "@/app/_apis/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  FileText, Download, Search, Calendar, DollarSign,
  AlertCircle, CheckCircle, Clock, Eye, Plus, RefreshCw
} from "lucide-react";

export default function RCMInvoices() {
  const dispatch = useDispatch<AppDispatch>();
  const selfPayPatients = useSelector((state: RootState) =>
    state.hospitalPatients.patients.filter(p => p.billing_type === "Self-Pay")
  );
  const {
    hospitalInvoices,
    hospitalInvoicesLoading,
    hospitalInvoicesError,
    selectedInvoice,
    downloading,
    downloadError,
    generating,
    generateError
  } = useSelector((state: RootState) => state.invoices);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialog, setViewDialog] = useState(false);
  const [generateDialog, setGenerateDialog] = useState(false);

  // Generate invoice form
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [generateNotes, setGenerateNotes] = useState("");

  useEffect(() => {
    dispatch(fetchHospitalInvoicesThunk({ skip: 0, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (hospitalInvoicesError) {
      toast.error(hospitalInvoicesError);
      dispatch(clearErrors());
    }
  }, [hospitalInvoicesError, dispatch]);

  useEffect(() => {
    if (downloadError) {
      toast.error(downloadError);
      dispatch(clearErrors());
    }
  }, [downloadError, dispatch]);

  useEffect(() => {
    if (generateError) {
      toast.error(generateError);
      dispatch(clearErrors());
    }
  }, [generateError, dispatch]);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) {
      return hospitalInvoices;
    }

    return hospitalInvoices.filter(invoice =>
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.patient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, hospitalInvoices]);

  const loadInvoices = () => {
    dispatch(fetchHospitalInvoicesThunk({ skip: 0, limit: 100 }));
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      const result = await dispatch(downloadHospitalInvoiceThunk(invoice.id)).unwrap();
      triggerDownload(result.blob, `invoice_${invoice.invoice_number}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      // Error already handled in useEffect
    }
  };

  const handleViewDetails = async (invoice: Invoice) => {
    try {
      await dispatch(fetchHospitalInvoiceDetails(invoice.id)).unwrap();
      setViewDialog(true);
    } catch (error: any) {
      // Error already handled in useEffect
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    try {
      const newInvoice = await dispatch(generateInvoiceThunk({
        patient_user_id: selectedPatient,
        notes: generateNotes || undefined
      })).unwrap();

      toast.success(`Invoice ${newInvoice.invoice_number} generated successfully!`);
      setGenerateDialog(false);
      setSelectedPatient(null);
      setPatientSearchTerm("");
      setGenerateNotes("");
    } catch (error: any) {
      // Error already handled in useEffect
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialog(false);
    dispatch(clearSelectedInvoice());
  };

  const filteredSelfPayPatients = useMemo(() =>
    selfPayPatients.filter(patient =>
      patient.full_name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(patientSearchTerm.toLowerCase())
    ), [selfPayPatients, patientSearchTerm]
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      partially_paid: { color: "bg-blue-100 text-blue-800", icon: AlertCircle },
      overdue: { color: "bg-red-100 text-red-800", icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const stats = useMemo(() => ({
    total: hospitalInvoices.length,
    pending: hospitalInvoices.filter(i => i.status === "pending").length,
    paid: hospitalInvoices.filter(i => i.status === "paid").length,
    partiallyPaid: hospitalInvoices.filter(i => i.status === "partially_paid").length,
    totalRevenue: hospitalInvoices.reduce((sum, i) => sum + i.total_amount, 0),
    collected: hospitalInvoices.reduce((sum, i) => sum + i.paid_amount, 0),
    outstanding: hospitalInvoices.reduce((sum, i) => sum + i.outstanding_amount, 0)
  }), [hospitalInvoices]);

  if (hospitalInvoicesLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-gray-600 mt-1">Manage and track patient invoices</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadInvoices}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setGenerateDialog(true)}
            className="bg-[#388fe5] hover:bg-[#6fb043] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-[#388fe5]">${stats.collected.toFixed(2)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">${stats.outstanding.toFixed(2)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <Badge className="bg-yellow-100 text-yellow-800">{stats.pending}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Partially Paid</span>
              <Badge className="bg-blue-100 text-blue-800">{stats.partiallyPaid}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Paid</span>
              <Badge className="bg-green-100 text-green-800">{stats.paid}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by invoice number, patient name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Invoice #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Patient</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Issue Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Due Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Paid</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Outstanding</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.patient_name}</p>
                          <p className="text-xs text-gray-600">{invoice.patient_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(invoice.issue_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ${invoice.total_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#388fe5]">
                        ${invoice.paid_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">
                        ${invoice.outstanding_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(invoice)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(invoice)}
                            disabled={downloading === invoice.id}
                            className="text-[#388fe5] hover:opacity-80-700"
                          >
                            {downloading === invoice.id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
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
        </CardContent>
      </Card>

      {/* Generate Invoice Dialog */}
      <Dialog open={generateDialog} onOpenChange={(open) => {
        setGenerateDialog(open);
        if (!open) {
          setSelectedPatient(null);
          setPatientSearchTerm("");
          setGenerateNotes("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
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
                placeholder="Add any notes for this invoice..."
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
              onClick={handleGenerateInvoice}
              disabled={!selectedPatient || generating}
              className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
            >
              {generating ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialog} onOpenChange={handleCloseViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient Name</p>
                  <p className="font-medium">{selectedInvoice.patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient Email</p>
                  <p className="font-medium">{selectedInvoice.patient_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg">${selectedInvoice.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="font-medium text-lg text-[#388fe5]">${selectedInvoice.paid_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="font-medium text-lg text-red-600">${selectedInvoice.outstanding_amount.toFixed(2)}</p>
                </div>
                {selectedInvoice.payment_method && (
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium capitalize">{selectedInvoice.payment_method}</p>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(selectedInvoice)}
                  disabled={downloading === selectedInvoice.id}
                  className="bg-[#388fe5] hover:bg-[#6fb043] text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

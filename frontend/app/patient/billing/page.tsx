"use client";

import { useState, useEffect } from "react";
import { getMyBills, getBillingSummary, getMyBillDetails, BillingSummary } from "@/app/_apis/patient/billing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StripePaymentDialog from "@/components/billing/StripePaymentDialog";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Bill } from "@/hooks/types/types";
import {
  FileText,
  DollarSign,
  Search,
  Eye,
  CreditCard,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { downloadPatientInvoice } from "@/store/slices/invoiceSlice";
import { triggerDownload } from "@/app/_apis/invoices";

export default function PatientBilling() {
  const dispatch = useDispatch<AppDispatch>();
  const { downloading } = useSelector((state: RootState) => state.invoices);

  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [viewDialog, setViewDialog] = useState<{ open: boolean; bill: Bill | null }>({
    open: false,
    bill: null
  });
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    billId: number | null;
    billNumber: string;
    outstandingAmount: number;
  }>({
    open: false,
    billId: null,
    billNumber: "",
    outstandingAmount: 0
  });

  // Fetch data on mount
  useEffect(() => {
    loadBills();
    loadSummary();
  }, []);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await getMyBills();
      setBills(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await getBillingSummary();
      setSummary(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load billing summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleViewBill = async (billId: number) => {
    try {
      const billDetails = await getMyBillDetails(billId);
      setViewDialog({ open: true, bill: billDetails });
    } catch (error: any) {
      toast.error(error.message || "Failed to load bill details");
    }
  };

  const handlePayBill = (bill: Bill) => {
    setPaymentDialog({
      open: true,
      billId: bill.id,
      billNumber: bill.bill_number,
      outstandingAmount: bill.outstanding_amount
    });
  };

  const handleDownloadInvoice = async (billId: number, billNumber: string) => {
    try {
      const result = await dispatch(downloadPatientInvoice(billId)).unwrap();
      triggerDownload(result.blob, `invoice_${billNumber}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to download invoice");
    }
  };

  const handlePaymentSuccess = () => {
    // Reload bills and summary after successful payment
    loadBills();
    loadSummary();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1">
            <Clock className="w-3 h-3" />
            PENDING
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
            <CheckCircle className="w-3 h-3" />
            PAID
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            OVERDUE
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 gap-1">
            <XCircle className="w-3 h-3" />
            CANCELLED
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "paid" || status === "cancelled") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bills</h1>
          <p className="text-gray-600">View and manage your medical bills</p>
        </div>

        {/* Summary Cards */}
        {summaryLoading ? (
          <div className="flex items-center justify-center h-40 mb-6">
            <InfinitySpin width="150" color="#388fe5" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_bills}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-[#388fe5]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-[#388fe5]">${summary.total_paid.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">${summary.total_outstanding.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Due</p>
                  <p className="text-lg font-bold text-gray-900">
                    {summary.next_due_date
                      ? new Date(summary.next_due_date).toLocaleDateString()
                      : "N/A"
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Overdue Alert */}
        {summary && summary.overdue_count > 0 && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  You have {summary.overdue_count} overdue bill{summary.overdue_count > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700">
                  Please make a payment to avoid late fees
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Bills Table */}
        <Card className="p-6 bg-white">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">All Bills</h2>
              <Button
                onClick={loadBills}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by bill number..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <InfinitySpin width="200" color="#388fe5" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="mx-auto h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No bills found</p>
              <p className="text-sm">You don't have any bills at the moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Bill Number
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Issue Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Due Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Total Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Outstanding
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => (
                    <tr
                      key={bill.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${isOverdue(bill.due_date, bill.status) ? 'bg-red-50' : ''
                        }`}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">
                        {bill.bill_number}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(bill.issue_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          {new Date(bill.due_date).toLocaleDateString()}
                          {isOverdue(bill.due_date, bill.status) && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                        ${bill.total_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-red-600">
                        ${bill.outstanding_amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(bill.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewBill(bill.id)}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(bill.id, bill.bill_number)}
                            disabled={downloading === bill.id}
                            className="gap-1"
                          >
                            {downloading === bill.id ? (
                              <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Invoice
                          </Button>
                          {bill.outstanding_amount > 0 && bill.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => handlePayBill(bill)}
                              className="bg-[#388fe5] hover:bg-[#6fb043] text-white gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* View Bill Dialog */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => setViewDialog({ open, bill: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {viewDialog.bill && (
            <div className="space-y-6">
              {/* Bill Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{viewDialog.bill.bill_number}</h3>
                  <p className="text-sm text-gray-600">
                    Issued: {new Date(viewDialog.bill.issue_date).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(viewDialog.bill.status)}
              </div>

              {/* Bill Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Patient Name</p>
                  <p className="font-semibold text-gray-900">{viewDialog.bill.patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Hospital</p>
                  <p className="font-semibold text-gray-900">{viewDialog.bill.hospital_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Due Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(viewDialog.bill.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold text-gray-900">
                    {viewDialog.bill.payment_method || "Not paid"}
                  </p>
                </div>
              </div>

              {/* Bill Items */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-900">Services & Charges</h3>
                <div className="space-y-3">
                  {viewDialog.bill.bill_items?.map((item) => (
                    <Card key={item.id} className="p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{item.icd_code}</span> - {item.icd_description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Service Date: {new Date(item.service_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-gray-900">${item.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Bill Summary */}
              <div className="border-t pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${viewDialog.bill.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#388fe5]">
                    <span>Amount Paid:</span>
                    <span className="font-semibold">-${viewDialog.bill.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                    <span>Amount Due:</span>
                    <span className="text-red-600">${viewDialog.bill.outstanding_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewDialog.bill.notes && (
                <div className="border-t pt-6">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {viewDialog.bill.notes}
                  </p>
                </div>
              )}

              {/* Payment Button */}
              {viewDialog.bill.outstanding_amount > 0 && viewDialog.bill.status !== "cancelled" && (
                <div className="border-t pt-6">
                  <Button
                    onClick={() => handlePayBill(viewDialog.bill!)}
                    className="w-full bg-[#388fe5] hover:bg-[#6fb043] text-white py-6 text-lg gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pay ${viewDialog.bill.outstanding_amount.toFixed(2)} Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {paymentDialog.billId && (
        <StripePaymentDialog
          open={paymentDialog.open}
          onOpenChange={(open) => setPaymentDialog({ ...paymentDialog, open })}
          billId={paymentDialog.billId}
          billNumber={paymentDialog.billNumber}
          outstandingAmount={paymentDialog.outstandingAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

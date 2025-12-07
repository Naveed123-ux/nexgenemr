"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchClaims, generateClaims } from "@/store/slices/claimsSlice";
import { fetchHospitalPatients } from "@/store/slices/hospitalPatientsSlice";
import { checkClaimEligibility, submitClaim } from "@/app/_apis/rcm/claims";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { EligibilityResponse, SubmissionResponse } from "@/hooks/types/types";
import {
  FileText,
  Users,
  AlertCircle,
  DollarSign,
  Search,
  FileBarChart,
  BarChart3,
  Plus,
  RefreshCw,
  CheckCircle,
  Send,
} from "lucide-react";

export default function PracticeManagementWorkflow() {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<
    "active" | "denials" | "analytics" | "generate"
  >("active");
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [eligibilityDialog, setEligibilityDialog] = useState<{
    open: boolean;
    data: EligibilityResponse | null;
  }>({ open: false, data: null });

  const [submissionDialog, setSubmissionDialog] = useState<{
    open: boolean;
    data: SubmissionResponse | null;
  }>({ open: false, data: null });

  // Loading states for individual claims
  const [checkingEligibility, setCheckingEligibility] = useState<number | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState<number | null>(null);

  // Track eligible claims
  const [eligibleClaims, setEligibleClaims] = useState<Set<number>>(new Set());

  // Redux state
  const { claims, loading, error, generateLoading, lastGenerateMessage } = useSelector(
    (state: RootState) => state.claims
  );
  const { patients } = useSelector((state: RootState) => state.hospitalPatients);


  // Filter insurance patients only
  const insurancePatients = useMemo(() => {
    return patients.filter(patient => patient.billing_type === "Insurance");
  }, [patients]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter(c => c.status === "pending").length;
    const approved = claims.filter(c => c.status === "approved").length;
    const denied = claims.filter(c => c.status === "denied").length;
    const paid = claims.filter(c => c.status === "paid").length;
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);

    return { total, pending, approved, denied, paid, totalAmount };
  }, [claims]);

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchClaims({}));
    dispatch(fetchHospitalPatients());
  }, [dispatch]);

  // Show success/error messages
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (lastGenerateMessage) {
      toast.success(lastGenerateMessage);
      // Refresh claims after successful generation
      dispatch(fetchClaims({}));
    }
  }, [lastGenerateMessage, dispatch]);

  const handleGenerateClaims = async (patientId: number) => {
    try {
      await dispatch(generateClaims(patientId)).unwrap();
    } catch (error: any) {

      // Handle specific error cases
      if (error === "No appointments found for this patient.") {
        toast.error("No appointments found for this patient. Please ensure the patient has scheduled appointments before generating claims.");
      } else if (typeof error === 'string' && error.includes("No appointments found")) {
        toast.error("No appointments found for this patient.");
      } else {
        toast.error(error || "Failed to generate claims. Please try again.");
      }
    }
  };

  const handleCheckEligibility = async (claimId: number) => {
    setCheckingEligibility(claimId);
    try {
      const eligibilityData = await checkClaimEligibility(claimId);
      setEligibilityDialog({ open: true, data: eligibilityData });

      // Track if claim is eligible for submission
      if (eligibilityData.eligibilityStatus === "Eligible") {
        setEligibleClaims(prev => new Set([...prev, claimId]));
        toast.success("Claim is eligible for submission!");
      } else {
        toast.error("Claim is not eligible for submission.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to check eligibility");
    } finally {
      setCheckingEligibility(null);
    }
  };

  const handleSubmitClaim = async (claimId: number) => {
    setSubmittingClaim(claimId);
    try {
      const submissionData = await submitClaim(claimId);
      setSubmissionDialog({ open: true, data: submissionData });

      if (submissionData.submissionStatus === "Accepted") {
        toast.success("Claim submitted successfully!");
        // Refresh claims to get updated status
        dispatch(fetchClaims({}));
      } else {
        toast.error("Claim submission was rejected.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit claim");
    } finally {
      setSubmittingClaim(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">PENDING</Badge>;
      case "approved":
        return <Badge className="bg-[#388fe5] hover:bg-[#6fb043] text-white">APPROVED</Badge>;
      case "denied":
        return <Badge variant="destructive">DENIED</Badge>;
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">PAID</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-16">
      {/* Header Navigation */}
      <header>
        <div className="mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button className="text-sm font-medium text-foreground border-b-2 border-foreground pb-4">
                Practice Management
              </button>
              <button className="text-sm font-medium text-muted-foreground pb-4">
                Dashboard
              </button>
            </div>
            <Button variant="outline" size="sm">
              Manage Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Revenue Cycle Management - Claims
            </h1>
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage insurance claims, generate new claims, and track payment status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Claims
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">All Claims</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Approved
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">{stats.approved + stats.paid}</p>
              <p className="text-xs text-muted-foreground">Approved Claims</p>
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
              <p className="text-xs text-muted-foreground">Need Review</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Total Amount
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">${stats.totalAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Claim Value</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full p-1 mb-6 flex">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "active"
                  ? "bg-[#388fe5] text-white"
                  : "bg-transparent text-black hover:bg-gray-300"
                }`}
            >
              All Claims
            </button>
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex-1 px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "generate"
                  ? "bg-[#388fe5] text-white"
                  : "bg-transparent text-black hover:bg-gray-300"
                }`}
            >
              Generate Claims
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex-1 px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === "analytics"
                  ? "bg-[#388fe5] text-white"
                  : "bg-transparent text-black hover:bg-gray-300"
                }`}
            >
              Analytics
            </button>
          </div>

          {/* All Claims Tab */}
          {activeTab === "active" && (
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    All Claims
                  </h2>
                  <Button
                    onClick={() => dispatch(fetchClaims({}))}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by patient name, claim ID, or insurance..."
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
              ) : claims.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No claims found</p>
                  <p className="text-sm">Generate claims for insurance patients to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[80px]">
                          Claim ID
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[120px]">
                          Patient
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[80px]">
                          Amount
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[100px]">
                          ICD Code
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[150px]">
                          Description
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[80px]">
                          Status
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[100px]">
                          Doctor
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground min-w-[90px]">
                          Due Date
                        </th>
                        <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground w-[1%] whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims
                        .filter(claim =>
                          claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          claim.id.toString().includes(searchTerm) ||
                          claim.insurance_company.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((claim) => (
                          <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 text-sm text-foreground">
                              {claim.id}
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-sm text-foreground">{claim.patient_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {claim.insurance_company}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">
                              ${claim.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">
                              {claim.code}
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">
                              {claim.icd_description}
                            </td>
                            <td className="py-3 px-3">
                              {getStatusBadge(claim.status)}
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">
                              {claim.doctor_info}
                            </td>
                            <td className="py-3 px-3 text-sm text-foreground">
                              {new Date(claim.due_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleCheckEligibility(claim.id)}
                                  disabled={checkingEligibility === claim.id}
                                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8 gap-1"
                                >
                                  {checkingEligibility === claim.id ? (
                                    <InfinitySpin width="12" color="#ffffff" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  Check
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitClaim(claim.id)}
                                  disabled={
                                    !eligibleClaims.has(claim.id) ||
                                    submittingClaim === claim.id ||
                                    claim.status === "paid"
                                  }
                                  className="bg-[#388fe5] hover:bg-[#6fb043] text-white text-xs h-8 gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {submittingClaim === claim.id ? (
                                    <InfinitySpin width="12" color="#ffffff" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  Submit
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
          )}

          {/* Generate Claims Tab */}
          {activeTab === "generate" && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Generate Claims for Insurance Patients
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select an insurance patient to generate claims for all their appointments.
                </p>
              </div>

              {insurancePatients.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No insurance patients found</p>
                  <p className="text-sm">Only patients with insurance billing can have claims generated.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {insurancePatients.map((patient) => (
                    <div key={patient.user_id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{patient.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{patient.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Insurance: {patient.insurer_name} | Member ID: {patient.member_id}
                          </p>
                          {patient.assigned_doctor_name && (
                            <p className="text-sm text-muted-foreground">
                              Doctor: {patient.assigned_doctor_name}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleGenerateClaims(patient.user_id)}
                          disabled={generateLoading}
                          className="bg-[#388fe5] hover:bg-[#6fb043] text-white gap-2"
                        >
                          {generateLoading ? (
                            <InfinitySpin width="16" color="#ffffff" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Generate Claims
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Analytics
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <FileBarChart className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">
                      Claim Status Distribution
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Pending</span>
                      <span className="text-sm font-medium text-foreground">{stats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Approved</span>
                      <span className="text-sm font-medium text-foreground">{stats.approved}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Denied</span>
                      <span className="text-sm font-medium text-foreground">{stats.denied}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Paid</span>
                      <span className="text-sm font-medium text-foreground">{stats.paid}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">
                      Performance Metrics
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Total Claims</span>
                      <span className="text-sm font-medium text-foreground">{stats.total}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Approval Rate</span>
                      <span className="text-sm font-medium text-foreground">
                        {stats.total > 0 ? Math.round(((stats.approved + stats.paid) / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Avg. Claim Amount</span>
                      <span className="text-sm font-medium text-foreground">
                        ${stats.total > 0 ? (stats.totalAmount / stats.total).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Total Value</span>
                      <span className="text-sm font-medium text-foreground">
                        ${stats.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Eligibility Check Dialog */}
      <Dialog open={eligibilityDialog.open} onOpenChange={(open) => setEligibilityDialog({ open, data: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Claim Eligibility Check</DialogTitle>
          </DialogHeader>
          {eligibilityDialog.data && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${eligibilityDialog.data.eligibilityStatus === "Eligible"
                    ? "bg-green-500"
                    : "bg-red-500"
                  }`} />
                <span className={`font-semibold ${eligibilityDialog.data.eligibilityStatus === "Eligible"
                    ? "text-green-700"
                    : "text-red-700"
                  }`}>
                  {eligibilityDialog.data.eligibilityStatus}
                </span>
                <span className="text-sm text-muted-foreground">
                  Transaction ID: {eligibilityDialog.data.transactionId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Patient Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {eligibilityDialog.data.patientDetails.name}</div>
                    <div><strong>Member ID:</strong> {eligibilityDialog.data.patientDetails.memberId}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Provider Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {eligibilityDialog.data.providerDetails.name}</div>
                    <div><strong>NPI:</strong> {eligibilityDialog.data.providerDetails.npi}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Service Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Code:</strong> {eligibilityDialog.data.serviceDetails.serviceCode}</div>
                    <div><strong>Description:</strong> {eligibilityDialog.data.serviceDetails.serviceDescription}</div>
                    <div><strong>Service Date:</strong> {new Date(eligibilityDialog.data.serviceDetails.serviceDate).toLocaleDateString()}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Coverage Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Plan:</strong> {eligibilityDialog.data.coverageDetails.planName}</div>
                    <div><strong>Co-Pay:</strong> {eligibilityDialog.data.coverageDetails.coPay}</div>
                    <div><strong>Deductible:</strong> {eligibilityDialog.data.coverageDetails.deductible}</div>
                    <div><strong>Co-Insurance:</strong> {eligibilityDialog.data.coverageDetails.coInsurance}</div>
                  </div>
                </Card>
              </div>

              {eligibilityDialog.data.rejectionReason && (
                <Card className="p-4 border-red-200 bg-red-50">
                  <h3 className="font-semibold text-red-700 mb-2">Rejection Reason</h3>
                  <p className="text-sm text-red-600">{eligibilityDialog.data.rejectionReason}</p>
                </Card>
              )}

              <div className="text-xs text-muted-foreground">
                Check Date: {new Date(eligibilityDialog.data.checkDate).toLocaleDateString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Result Dialog */}
      <Dialog open={submissionDialog.open} onOpenChange={(open) => setSubmissionDialog({ open, data: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Claim Submission Result</DialogTitle>
          </DialogHeader>
          {submissionDialog.data && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${submissionDialog.data.submissionStatus === "Accepted"
                    ? "bg-green-500"
                    : "bg-red-500"
                  }`} />
                <span className={`font-semibold ${submissionDialog.data.submissionStatus === "Accepted"
                    ? "text-green-700"
                    : "text-red-700"
                  }`}>
                  {submissionDialog.data.submissionStatus}
                </span>
                <span className="text-sm text-muted-foreground">
                  Confirmation ID: {submissionDialog.data.confirmationId}
                </span>
              </div>

              <Card className="p-4 bg-green-50 border-green-200">
                <p className="text-green-700">{submissionDialog.data.message}</p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Submission Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Submission ID:</strong> {submissionDialog.data.submittedData.header.submissionId}</div>
                    <div><strong>Date:</strong> {new Date(submissionDialog.data.submittedData.header.submissionDate).toLocaleDateString()}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Payer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {submissionDialog.data.submittedData.payer.name}</div>
                    <div><strong>Payer ID:</strong> {submissionDialog.data.submittedData.payer.payerId}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Patient Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {submissionDialog.data.submittedData.patient.name}</div>
                    <div><strong>Member ID:</strong> {submissionDialog.data.submittedData.patient.memberId}</div>
                    <div><strong>DOB:</strong> {new Date(submissionDialog.data.submittedData.patient.dateOfBirth).toLocaleDateString()}</div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Claim Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Claim ID:</strong> {submissionDialog.data.submittedData.claimDetails.claimId}</div>
                    <div><strong>Service Date:</strong> {new Date(submissionDialog.data.submittedData.claimDetails.serviceDate).toLocaleDateString()}</div>
                    <div><strong>Total Amount:</strong> ${submissionDialog.data.submittedData.claimDetails.totalAmount.toFixed(2)}</div>
                  </div>
                </Card>
              </div>

              {submissionDialog.data.submittedData.claimDetails.diagnoses.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Diagnoses</h3>
                  <div className="space-y-1">
                    {submissionDialog.data.submittedData.claimDetails.diagnoses.map((diagnosis, index) => (
                      <div key={index} className="text-sm">
                        <strong>{diagnosis.code}</strong> ({diagnosis.type})
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";
import { useState } from "react";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Wallet,
  Upload,
  Download,
} from "lucide-react";

type TabType = "era-processing" | "payment-details" | "batch-posting";

const eraData = [
  {
    id: "ERA-001",
    payer: "Blue Cross Blue Shield",
    check: "CHK-789123",
    amount: "1250.00",
    claims: 5,
    received: "2025-09-26",
    status: "Pending",
  },
  {
    id: "ERA-002",
    payer: "Aetna",
    check: "CHK-789124",
    amount: "875.00",
    claims: 2,
    received: "2025-09-25",
    status: "Posted",
  },
  {
    id: "ERA-003",
    payer: "Medicare",
    check: "CHK-789125",
    amount: "450.00",
    claims: 2,
    received: "2025-09-24",
    status: "Reviewed",
  },
];

// NOTE: The main component is updated with the new tab switcher.
// The sub-components (ERAProcessingTab, PaymentDetailsTab, BatchPostingTab) remain the same as before.
export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("payment-details");

  return (
    <div className="min-h-screen bg-gray-50 p-6 mt-10">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span>Practice Management</span>
              <span>/</span>
              <span className="text-gray-700 font-medium">Dashboard</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Practice Management Workflow
            </h1>
            <p className="text-sm text-gray-500">
              EMR/EHR Revenue Cycle Management - From Encounter to Payment
              Collection
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Last edited</div>
              <div className="text-sm font-medium text-gray-700">
                01 Dec 2023
              </div>
            </div>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Manage Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Payments</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-semibold text-gray-900">$510.00</div>
          <div className="text-xs text-gray-500">Received today</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Posted Payments</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-3xl font-semibold text-gray-900">2</div>
          <div className="text-xs text-gray-500">Successfully posted</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Adjustments</span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-semibold text-gray-900">$85.00</div>
          <div className="text-xs text-gray-500">Contractual adjustments</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Patient Balance</span>
            <Wallet className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-semibold text-gray-900">$80.00</div>
          <div className="text-xs text-gray-500">Due from patients</div>
        </div>
      </div>

      {/* Tab Navigation - UPDATED */}
      <div className="flex bg-gray-200/70 rounded-full p-1.5 mb-8 max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab("era-processing")}
          className={`flex-1 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ease-in-out ${activeTab === "era-processing"
              ? "bg-green-primary text-white shadow-md"
              : "text-gray-600 hover:bg-gray-300/50"
            }`}
        >
          ERA Processing
        </button>
        <button
          onClick={() => setActiveTab("payment-details")}
          className={`flex-1 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ease-in-out ${activeTab === "payment-details"
              ? "bg-green-primary text-white shadow-md"
              : "text-gray-600 hover:bg-gray-300/50"
            }`}
        >
          Payment Details
        </button>
        <button
          onClick={() => setActiveTab("batch-posting")}
          className={`flex-1 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 ease-in-out ${activeTab === "batch-posting"
              ? "bg-green-primary text-white shadow-md"
              : "text-gray-600 hover:bg-gray-300/50"
            }`}
        >
          Batch Posting
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "era-processing" && <ERAProcessingTab />}
      {activeTab === "payment-details" && <PaymentDetailsTab />}
      {activeTab === "batch-posting" && <BatchPostingTab />}
    </div>
  );
}

// These components have not changed
function ERAProcessingTab() {
  const [selectedEraId, setSelectedEraId] = useState("ERA-001");
  const selectedEra = eraData.find((era) => era.id === selectedEraId);

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "Pending":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            Pending
          </span>
        );
      case "Posted":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Posted
          </span>
        );
      case "Reviewed":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            Reviewed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Electronic Remittance Advice */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Electronic Remittance Advice
            </h2>
            <p className="text-sm text-gray-500">
              Process incoming ERA files from payers
            </p>
          </div>
        </div>
        <div className="flex gap-3 mb-6">
          <button className="flex items-center gap-2 w-full justify-center px-4 py-2 bg-green-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors">
            <Upload className="w-4 h-4" /> Import ERA
          </button>
          <button className="flex items-center gap-2 w-full justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>

        <div className="space-y-3">
          {eraData.map((era) => (
            <div
              key={era.id}
              onClick={() => setSelectedEraId(era.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedEraId === era.id
                  ? "border-green-primary bg-green-50/50 ring-2 ring-green-primary/20"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{era.id}</div>
                  <div className="text-sm text-gray-500">
                    Payer: {era.payer}
                  </div>
                  <div className="text-sm text-gray-500">
                    Check: {era.check}
                  </div>
                  <div className="text-sm text-gray-500">
                    Amount: ${era.amount} | Claims: {era.claims}
                  </div>
                  <div className="text-sm text-gray-500">
                    Received: {era.received}
                  </div>
                </div>
                <StatusBadge status={era.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - ERA Details & Processing Actions */}
      {selectedEra && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ERA Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-800">
                  {selectedEra.payer} - {selectedEra.id}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Check Number</span>
                  <span className="font-medium text-gray-900">
                    {selectedEra.check}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date Received</span>
                  <span className="font-medium text-gray-900">
                    {selectedEra.received}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-medium text-gray-900">
                    ${selectedEra.amount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Claims Count</span>
                  <span className="font-medium text-gray-900">
                    {selectedEra.claims}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Processing Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Auto-Post Payments
              </button>
              <button className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
                Review Manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentDetailsTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
        <p className="text-sm text-gray-500">
          Review individual payment postings and adjustments
        </p>
      </div>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Payment ID
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Patient
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Payer
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Original
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Paid
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Adjustment
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Patient Resp.
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Status
              </th>
              <th className="text-left font-medium text-gray-500 pb-3 px-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-3 font-medium text-gray-800">PAY-001</td>
              <td className="py-3 px-3">
                <div className="font-medium text-gray-800">Sarah Johnson</div>
                <div className="text-xs text-gray-500">PAT-12345</div>
              </td>
              <td className="py-3 px-3 text-gray-600">
                Blue Cross Blue Shield
              </td>
              <td className="py-3 px-3 text-gray-600">$175.00</td>
              <td className="py-3 px-3 text-[#388fe5] font-medium">$150.00</td>
              <td className="py-3 px-3 text-red-600">-$0.00</td>
              <td className="py-3 px-3 text-gray-600">$25.00</td>
              <td className="py-3 px-3">
                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Posted
                </span>
              </td>
              <td className="py-3 px-3">
                <button className="font-medium text-gray-700 hover:text-gray-900">
                  View
                </button>
              </td>
            </tr>

            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-3 font-medium text-gray-800">PAY-002</td>
              <td className="py-3 px-3">
                <div className="font-medium text-gray-800">Robert Wilson</div>
                <div className="text-xs text-gray-500">PAT-12346</div>
              </td>
              <td className="py-3 px-3 text-gray-600">United Healthcare</td>
              <td className="py-3 px-3 text-gray-600">$300.00</td>
              <td className="py-3 px-3 text-[#388fe5] font-medium">$240.00</td>
              <td className="py-3 px-3 text-red-600">-$35.00</td>
              <td className="py-3 px-3 text-gray-600">$25.00</td>
              <td className="py-3 px-3">
                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Posted
                </span>
              </td>
              <td className="py-3 px-3">
                <button className="font-medium text-gray-700 hover:text-gray-900">
                  View
                </button>
              </td>
            </tr>

            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-3 font-medium text-gray-800">PAY-003</td>
              <td className="py-3 px-3">
                <div className="font-medium text-gray-800">Maria Garcia</div>
                <div className="text-xs text-gray-500">PAT-12347</div>
              </td>
              <td className="py-3 px-3 text-gray-600">Medicare</td>
              <td className="py-3 px-3 text-gray-600">$200.00</td>
              <td className="py-3 px-3 text-[#388fe5] font-medium">$120.00</td>
              <td className="py-3 px-3 text-red-600">-$50.00</td>
              <td className="py-3 px-3 text-gray-600">$30.00</td>
              <td className="py-3 px-3">
                <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  Partial
                </span>
              </td>
              <td className="py-3 px-3 flex items-center gap-3">
                <button className="font-medium text-gray-700 hover:text-gray-900">
                  View
                </button>
                <button className="px-3 py-1 bg-gray-800 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors">
                  Follow Up
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Adjustment Reasons
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-800">
                Robert Wilson - PAY-002
              </span>
              <div className="text-xs text-gray-500">
                Contractual adjustment
              </div>
            </div>
            <span className="text-red-600 font-semibold">-$35.00</span>
          </div>
          <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-800">
                Maria Garcia - PAY-003
              </span>
              <div className="text-xs text-gray-500">
                Medicare allowable reduction
              </div>
            </div>
            <span className="text-red-600 font-semibold">-$50.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchPostingTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Batch Payment Posting
        </h2>
        <p className="text-sm text-gray-500">
          Process multiple payments simultaneously
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Ready to Post
          </h3>
          <div className="text-4xl font-semibold text-gray-900">12</div>
          <div className="text-xs text-gray-500 mb-4">Payments pending</div>
          <button className="mt-auto w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
            Post All
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Require Review
          </h3>
          <div className="text-4xl font-semibold text-gray-900">3</div>
          <div className="text-xs text-gray-500 mb-4">Need attention</div>
          <button className="mt-auto w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            Review
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Posted Today
          </h3>
          <div className="text-4xl font-semibold text-gray-900">45</div>
          <div className="text-xs text-gray-500 mb-4">Successfully posted</div>
          <button className="mt-auto w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
            View Report
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Batch Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-900 mb-1">
              Auto-Post Settings
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Configure automatic posting rules for routine payments
            </p>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Configure Rules
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-5">
            <h4 className="font-semibold text-gray-900 mb-1">
              Exception Handling
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Manage payments that require manual review
            </p>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
              View Exceptions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

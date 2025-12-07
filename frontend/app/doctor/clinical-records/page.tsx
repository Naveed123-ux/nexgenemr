// app/doctor/clinical-records/page.tsx

"use client";

import { ClinicalRecordsList } from "./_components/ClinicalRecordsList";

export default function ClinicalRecordsPage() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#388fe5] to-[#6fb043] rounded-xl shadow-lg">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#388fe5] to-[#6fb043] bg-clip-text text-transparent">
                            Clinical Records Management
                        </h1>
                        <p className="text-gray-600 mt-1">
                            View, add, or update patient vitals and medical history
                        </p>
                    </div>
                </div>
            </div>

            <ClinicalRecordsList />
        </div>
    );
}
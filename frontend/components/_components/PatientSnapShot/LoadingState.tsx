"use client";

import { InfinitySpin } from "react-loader-spinner";

export const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
    <InfinitySpin width="200" color="#16a34a" />
    <p className="mt-4 text-lg font-medium text-slate-600">
      Loading Patient Data...
    </p>
  </div>
);
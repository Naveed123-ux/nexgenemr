"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Siren } from "lucide-react";

export const ErrorState = ({ error }: { error: string }) => (
  <div className="flex items-center justify-center h-screen bg-slate-50 p-4">
    <Alert variant="destructive" className="max-w-md">
      <Siren className="h-4 w-4" />
      <AlertTitle>Failed to Load Patient Data</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
);
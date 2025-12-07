"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactMarkdown from 'react-markdown'; // <-- Import the markdown renderer
import { AppDispatch, RootState } from "@/store/store";
import { fetchPatientSynopsis } from "@/store/slices/patientSynopsisSlice";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertCircle } from "lucide-react";

interface PatientSynopsisProps {
  patientId: number;
}

export const PatientSynopsis: React.FC<PatientSynopsisProps> = ({
  patientId,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { synopsisText, status, error } = useSelector(
    (state: RootState) => state.patientSynopsis
  );

  const handleGenerate = () => {
    dispatch(fetchPatientSynopsis(patientId));
  };

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }
    if (status === "failed") {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (status === "succeeded" && synopsisText) {
      // --- THIS IS THE UPDATED PART ---
      // Use the ReactMarkdown component to render the text
      // The `prose` class will automatically style headings, paragraphs, etc.
      return (
        <article className="prose prose-sm max-w-none text-slate-700">
          <ReactMarkdown>{synopsisText}</ReactMarkdown>
        </article>
      );
    }
    return (
      <p className="text-sm text-slate-500">
        Click the button to generate an AI-powered summary of this patient's
        clinical history.
      </p>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>AI Clinical Synopsis</CardTitle>
            <CardDescription>
              A summary of the patient's progress and status.
            </CardDescription>
          </div>
          <Button onClick={handleGenerate} className="bg-green-primary"  disabled={status === "loading"}>
            <Sparkles className="h-4 w-4 mr-2" />
            {status === "loading" ? "Generating..." : "Generate Synopsis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
};
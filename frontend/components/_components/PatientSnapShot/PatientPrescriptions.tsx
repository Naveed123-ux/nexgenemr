"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchPrescriptionsForPatient,
  resetPatientPrescriptions,
} from "@/store/slices/patientPrescriptionsSlice"; // <-- UPDATED IMPORT

import { InfinitySpin } from "react-loader-spinner";
import { PrescriptionList } from "@/components/prescriptions/PrescriptionList";

interface PatientPrescriptionsProps {
  patientProfileId: number;
}

export function PatientPrescriptions({
  patientProfileId,
}: PatientPrescriptionsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { prescriptions, status } = useSelector(
    (state: RootState) => state.patientPrescriptions // <-- UPDATED SELECTOR
  );

  useEffect(() => {
    // When the component mounts or the patient ID changes,
    // clear previous data and fetch new prescriptions.
    dispatch(resetPatientPrescriptions()); // <-- UPDATED ACTION
    if (patientProfileId) {
      dispatch(fetchPrescriptionsForPatient(patientProfileId)); // <-- UPDATED THUNK
    }

    // Cleanup function to reset state when the component unmounts
    return () => {
      dispatch(resetPatientPrescriptions()); // <-- UPDATED ACTION
    };
  }, [patientProfileId, dispatch]);

  return (
    <div className="space-y-6">
      {status === "loading" ? (
        <div className="flex justify-center py-8">
          <InfinitySpin color="#388fe5" />
        </div>
      ) : (
        <PrescriptionList prescriptions={prescriptions} />
      )}
    </div>
  );
}
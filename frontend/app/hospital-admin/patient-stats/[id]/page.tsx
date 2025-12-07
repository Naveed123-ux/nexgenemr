// src/app/doctor/patient-stats/[id]/page.tsx

import PatientSnapshot from "@/components/patient-stats";
import React from "react";

// This is a server component that passes params to the client component
const PatientStatsPage = ({ params }: { params: { id: string } }) => {
    
  // You can add server-side logic here if needed,
  // like checking permissions before rendering.

  return <PatientSnapshot id={params.id} />;
};

export default PatientStatsPage;
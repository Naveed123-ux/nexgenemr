"use client";

import SharedProfile from "@/components/shared-profile";
import { useAppSelector } from "@/hooks/useStore";

export default function HospitalAdminProfilePage() {
  const user = useAppSelector((state) => state.auth);
  
  const userName = user?.name || "Hospital Admin";

  return (
    <SharedProfile 
      adminType="Hospital Admin" 
      userName={userName}
      userTitle="Hospital Administrator"
    />
  );
}

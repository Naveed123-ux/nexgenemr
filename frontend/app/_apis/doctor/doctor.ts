import { privateApi } from "@/lib/axios";
import axios from "axios";

// ❌ DEPRECATED: Old availability template system removed
// ✅ Use the new unified slot system in @/app/_apis/doctor/slots.ts instead

export const connectGoogle = async () => {
  try {
    const response = await privateApi.get("/google/auth/url");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || "Failed to connect");
    }
    throw new Error("Failed to connect");
  }
};

// Note: Audio generation is now handled through Redux (generateSoapNoteFromAudio)
// Text generation is also handled through Redux (generateSoapNoteFromText)
// See soapSlice.ts for the implementation

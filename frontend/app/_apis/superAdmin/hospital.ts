import { privateApi } from "@/lib/axios";
import { isAxiosError } from "axios";
export const createHospital = async (data: FormData) => {
  try {
    const response = await privateApi.post("/hospitals", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error?.response) {
        console.log("Error response:", error.response);
        throw new Error(
          error.response?.data?.detail || "Hospital creation failed"
        );
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
  }
};

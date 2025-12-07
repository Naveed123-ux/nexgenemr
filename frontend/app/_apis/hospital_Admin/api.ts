import { privateApi } from "@/lib/axios";
import { isAxiosError } from "axios";
import { Staff } from "@/hooks/types/types";

export const createDepartment = async (data: FormData) => {
  try {
    const response = await privateApi.post("/departments/", data, {
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
export const createDoctor = async (data: FormData) => {
  try {
    const response = await privateApi.post("/doctors", data, {
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
export const createStaff = async (data: FormData) => {
  try {
    const response = await privateApi.post("/staff", data, {
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
          error.response?.data?.detail || "staff creation failed"
        );
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
  }
};

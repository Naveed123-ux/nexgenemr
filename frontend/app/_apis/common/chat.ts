import { privateApi } from "@/lib/axios";
import axios from "axios";

export const sendMessage = async (id: number, message: string) => {
  try {
    const response = await privateApi.post(
      `/messaging/conversations/${id}/messages`,
      { content: message }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(error.response?.data?.detail || "error sending message");
      return error.response?.data?.detail || "error sending message";
    }
    return "error sending message";
  }
};

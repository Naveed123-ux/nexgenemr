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
      throw error;
    }
    throw new Error("error sending message");
  }
};

export const blockUser = async (userId: number) => {
  return await privateApi.post(`/messaging/block/${userId}`);
};

export const unblockUser = async (userId: number) => {
  return await privateApi.post(`/messaging/unblock/${userId}`);
};

export const getContacts = async () => {
  const response = await privateApi.get("/messaging/contacts");
  return response.data;
};

import publicApi, { privateApi } from "@/lib/axios";
import { LoginSchema, RoleType } from "@/hooks/types/types";
import { isAxiosError } from "axios";
import { HospitalCreationData } from "@/hooks/types/types";
type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user_id: number;
  email: string;
  role: RoleType; 
  first_name: string;
  last_name: string;
};
export const login = async (data: LoginSchema):Promise<LoginResponse | undefined> => {
  try {
    const response = await publicApi.post("/users/login", data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Login failed");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
  }
};

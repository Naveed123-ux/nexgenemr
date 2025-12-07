import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit"; // ✅ import from Redux Toolkit
import { Department } from "@/hooks/types/types";
import { privateApi } from "@/lib/axios";
import toast from "react-hot-toast";
interface AuthState {
  department: Department[] | null;
}
export const fetchDepartments = createAsyncThunk(
  "department/fetchDepartments",
  async (_, { rejectWithValue }) => {
    try {
      const res = await privateApi.get<Department[]>("/departments/");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to user");
    }
  }
);
const initialState: AuthState = {
  department: null,
};

export const departmentSlice = createSlice({
  name: "department",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    let toastingId: string;

    builder.addCase(
      fetchDepartments.fulfilled,
      (state, action: PayloadAction<Department[]>) => {
        if (!state.department) {
          toast.success("Departments loaded successfully");
        }
        if (toastingId) {
          toast.dismiss(toastingId);
          toastingId = "";
        }

        state.department = action.payload;
      }
    );
  },
});

// Export actions and reducer

export default departmentSlice.reducer;

import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Appointment, StaffData, StaffProfile } from "@/hooks/types/types";
import toast from "react-hot-toast";
import { join } from "path";
import { fetchAllDoctors } from "./allDoctors";
import { stat } from "fs";

// Define the hospital type
interface AllStaffState {
  AllStaff: StaffProfile[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  singleAppointmentSelected: Appointment | null;
}
const initialState: AllStaffState = {
  AllStaff: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
  pageSize: 5,
  singleAppointmentSelected: null,
};

// Async thunk for fetching hospitals
export const fetchAllStaff = createAsyncThunk(
  "allStaff/fetchAllStaff",
  async ({ page = 1 }: { page?: number }, ThunkApi) => {
    console.log("Fetching Staff for page:", page);
    try {
      const res = await privateApi.get<StaffData>(`/staff/?page=${page}`);

      const data = res.data;
      console.log("Fetched staff data:", data);
      const staff = data.staff.map((staff: StaffProfile) => ({
        user_id: staff.user_id,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        job_title: staff.job_title,

        profile_picture_url: staff.profile_picture_url,
      }));
      return {
        data: staff,
        total: data.total,
        page: data.page,
        pageSize: data.size,
        totalPages: data.totalPages,
      };
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch Doctors"
      );
    }
  }
);

const AllStaff = createSlice({
  name: "allStaff",
  initialState,
  reducers: {
    selectSingleAppointment: (state, action: PayloadAction<Appointment>) => {
      state.singleAppointmentSelected = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAllStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllStaff.fulfilled, (state, action) => {
        if (state.AllStaff.length === 0) {
          toast.success("Staff loaded successfully");
        }
        state.loading = false;
        state.AllStaff = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages; // Update totalPages
      })
      .addCase(fetchAllStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch Staff";
      });
  },
});
export const { selectSingleAppointment } = AllStaff.actions;
export default AllStaff.reducer;

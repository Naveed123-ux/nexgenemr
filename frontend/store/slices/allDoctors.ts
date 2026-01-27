import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { DataDoctors, DoctorProfile } from "@/hooks/types/types";
import toast from "react-hot-toast";

// Define the hospital type
interface AllDoctorsState {
  AllDoctors: DoctorProfile[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

const initialState: AllDoctorsState = {
  AllDoctors: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
  pageSize: 5,
};

// Async thunk for fetching hospitals
export const fetchAllDoctors = createAsyncThunk(
  "allDoctors/fetchAllDoctors",
  async ({ page = 1 }: { page?: number }, ThunkApi) => {
    console.log("Fetching hospitals for page:", page);
    try {
      const res = await privateApi.get<DataDoctors>(`/doctors/?page=${page}`);

      const data = res.data;
      console.log("Fetched doctors data:", data);
      const doctors = data.doctors.map((doctor: DoctorProfile) => ({
        user_id: doctor.user_id,
        email: doctor.email,
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        profile_id: doctor.profile_id,
        specialization: doctor.specialization,
        department_name: doctor.department_name,
        profile_picture_url: doctor.profile_picture_url,
        is_active: doctor.is_active,
      }));
      return {
        data: doctors,
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

export const toggleDoctorStatus = createAsyncThunk(
  "allDoctors/toggleDoctorStatus",
  async (doctorUserId: number, ThunkApi) => {
    try {
      const res = await privateApi.post(`/doctors/${doctorUserId}/toggle-status`);
      toast.success("Doctor status updated successfully");
      return res.data;
    } catch (err: any) {
      toast.error("Failed to update doctor status");
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to toggle status"
      );
    }
  }
);


const AllDoctors = createSlice({
  name: "allDoctors",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllDoctors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllDoctors.fulfilled, (state, action) => {
        if (state.AllDoctors.length === 0) {
          toast.success("Doctors loaded successfully");
        }
        state.loading = false;
        state.AllDoctors = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages; // Update totalPages
      })
      .addCase(fetchAllDoctors.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch Doctors";
      })
      .addCase(toggleDoctorStatus.fulfilled, (state, action) => {
        const updatedDoctor = action.payload;
        const index = state.AllDoctors.findIndex(d => d.user_id === updatedDoctor.user_id);
        if (index !== -1) {
          state.AllDoctors[index] = {
            ...state.AllDoctors[index],
            ...updatedDoctor
          };
        }
      });

  },
});

export default AllDoctors.reducer;

import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { DataHospitals, Hospital } from "@/hooks/types/types";
import toast from "react-hot-toast";

// Define the hospital type
interface Allhospital {
  id: number;
  name: string;
  code: string;
  email: string;
  phone_number: string;
  country: string;
  logo_url: string;
  is_active: boolean;
}


interface Stats {
  totalHospitals: number;
  newHospitalsToday: number;
  oldHospitals: number;
  visitors: number;
}

// State interface
interface HospitalState {
  Allhospitals: Allhospital[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  stats: Stats;
}

const initialState: HospitalState = {
  Allhospitals: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 0,
  pageSize: 5,
  stats: {
    totalHospitals: 0,
    newHospitalsToday: 0,
    oldHospitals: 0,
    visitors: 0,
  },
};


// Async thunk for fetching hospitals
export const fetchAllHospitals = createAsyncThunk(
  "allHospitals/fetchAllHospitals",
  async ({ page = 1 }: { page?: number }, ThunkApi) => {
    console.log("Fetching hospitals for page:", page);
    try {
      const res = await privateApi.get<DataHospitals>(
        `/hospitals/?page=${page}`
      );

      const data = res.data;
      console.log("Fetched hospitals data:", data);
      const hospitals = data.hospitals.map((hospital: Hospital) => ({
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        email: hospital.email,
        phone_number: hospital.phone_number,
        country: hospital.country,
        logo_url: hospital.logo_url,
        is_active: hospital.is_active,
      }));

      return {
        data: hospitals,
        total: data.total,
        page: data.page,
        pageSize: data.size,
        totalPages: data.totalPages,
      };
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch hospitals"
      );
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  "allHospitals/fetchDashboardStats",
  async (_, ThunkApi) => {
    try {
      const res = await privateApi.get<Stats>("/hospitals/dashboard/stats");
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch stats"
      );
    }
  }
);

export const toggleHospitalStatus = createAsyncThunk(
  "allHospitals/toggleHospitalStatus",
  async (hospitalId: number, ThunkApi) => {
    try {
      const res = await privateApi.post(`/hospitals/${hospitalId}/toggle-status`);
      toast.success("Hospital status updated successfully");
      return res.data;
    } catch (err: any) {
      toast.error("Failed to update hospital status");
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to toggle status"
      );
    }
  }
);


const hospitalSlice = createSlice({
  name: "allHospitals",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllHospitals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllHospitals.fulfilled, (state, action) => {
        if (state.Allhospitals.length === 0) {
          toast.success("Hospitals loaded successfully");
        }
        state.loading = false;
        state.Allhospitals = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchAllHospitals.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch hospitals";
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(toggleHospitalStatus.fulfilled, (state, action) => {
        const updatedHospital = action.payload;
        const index = state.Allhospitals.findIndex(h => h.id === updatedHospital.id);
        if (index !== -1) {
          state.Allhospitals[index] = {
            ...state.Allhospitals[index],
            ...updatedHospital
          };
        }
      });
  },
});


export default hospitalSlice.reducer;

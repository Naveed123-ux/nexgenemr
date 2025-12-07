// src/store/slices/hospitalProfileSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios"; // Your configured axios instance

// ---- Types ----
export interface HospitalProfile {
  id: number;
  name: string;
  code: string;
  email: string;
  phone_number: string;
  country: string;
  address: string;
  time_zone: string;
  primary_language: string;
  header_text: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  favicon_url: string | null;
  sidebar_color: string;
  header_color: string;
}

// Type for the update payload, excluding read-only fields
type UpdateHospitalProfilePayload = Omit<HospitalProfile, 'id' | 'email' | 'code' | 'logo_url' | 'favicon_url' | 'admin_user_id'>;


// ---- State ----
interface HospitalProfileState {
  profile: HospitalProfile | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: HospitalProfileState = {
  profile: null,
  status: "idle",
  error: null,
};

// ---- Async Thunks ----
export const fetchHospitalProfile = createAsyncThunk(
  "hospitalProfile/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<HospitalProfile>("/hospitals/me");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to fetch hospital profile.");
    }
  }
);

export const updateHospitalProfile = createAsyncThunk(
  "hospitalProfile/update",
  async (profileData: UpdateHospitalProfilePayload, { rejectWithValue }) => {
    try {
      const response = await privateApi.put<HospitalProfile>("/hospitals/me", profileData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update hospital profile.");
    }
  }
);


// ---- Slice Definition ----
const hospitalProfileSlice = createSlice({
  name: "hospitalProfile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchHospitalProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchHospitalProfile.fulfilled, (state, action: PayloadAction<HospitalProfile>) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchHospitalProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // Update Profile
       .addCase(updateHospitalProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateHospitalProfile.fulfilled, (state, action: PayloadAction<HospitalProfile>) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(updateHospitalProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default hospitalProfileSlice.reducer;
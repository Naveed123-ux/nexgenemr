import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit"; // ✅ import from Redux Toolkit
import { Hospital } from "@/hooks/types/types";
import { privateApi } from "@/lib/axios";
import toast from "react-hot-toast";

interface AuthState {
  isAuthenticated: boolean;
  hospital: Hospital | null;
  id: number | null;
  name: string | null;
  token: string | null;
  email: string | null;
  role: string | null;
  job_title: string | null;
  hospital_id: number | null;
  first_name: string | null;
  last_name: string | null;
  profile_picture_url: string | null;
  // Doctor-specific fields
  specialization: string | null;
  department_name: string | null;
  medical_license_number: string | null;
  qualifications: string | null;
  years_of_experience: number | null;
  npi_number: string | null;
  dea_number: string | null;
  available_for_telehealth: boolean | null;
  biography: string | null;
  languages_spoken: string[] | null;
  is_google_connected: boolean | null;
}

interface StaffProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  job_title: string;
  hospital_id: number;
  profile_picture_url: string;
}

interface DoctorProfile {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  specialization: string;
  department_name: string;
  medical_license_number: string;
  qualifications: string;
  years_of_experience: number;
  npi_number: string;
  dea_number: string;
  available_for_telehealth: boolean;
  biography: string;
  languages_spoken: string[];
  profile_picture_url: string;
  is_google_connected: boolean;
}

export const fetchUserInfo = createAsyncThunk(
  "auth/fetchUserInfo",
  async (_, { rejectWithValue }) => {
    try {
      const res = await privateApi.get("/users/me");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to fetch user info");
    }
  }
);

export const fetchHospitalInfo = createAsyncThunk(
  "auth/fetchHospitalInfo",
  async (_, { rejectWithValue }) => {
    try {
      const res = await privateApi.get<Hospital>("/hospitals/me");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to user");
    }
  }
);

export const fetchStaffInfo = createAsyncThunk(
  "auth/fetchStaffInfo",
  async (_, { rejectWithValue }) => {
    try {
      const res = await privateApi.get<StaffProfile>("/staff/me");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to staff");
    }
  }
);

export const fetchDoctorInfo = createAsyncThunk(
  "auth/fetchDoctorInfo",
  async (_, { rejectWithValue }) => {
    try {
      const res = await privateApi.get<DoctorProfile>("/doctors/me");
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.detail || "Failed to fetch doctor info");
    }
  }
);

const initialState: AuthState = {
  isAuthenticated: false,
  id: null,
  name: null,
  hospital: null,
  token: null,
  email: null,
  role: null,
  job_title: null,
  hospital_id: null,
  first_name: null,
  last_name: null,
  profile_picture_url: null,
  specialization: null,
  department_name: null,
  medical_license_number: null,
  qualifications: null,
  years_of_experience: null,
  npi_number: null,
  dea_number: null,
  available_for_telehealth: null,
  biography: null,
  languages_spoken: null,
  is_google_connected: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{ token: string; name: string; id: number; email?: string; first_name?: string; last_name?: string }>
    ) {
      state.token = action.payload.token;
      state.id = action.payload.id;
      state.name = action.payload.name;
      state.email = action.payload.email || null;
      state.first_name = action.payload.first_name || null;
      state.last_name = action.payload.last_name || null;
      state.isAuthenticated = true;
    },
    Logout(state) {
      state.token = null;
      state.hospital = null;
      state.name = null;
      state.isAuthenticated = false;
      state.id = null;
      state.email = null;
      state.first_name = null;
      state.last_name = null;
      state.job_title = null;
      state.hospital_id = null;
      state.profile_picture_url = null;
      state.specialization = null;
      state.department_name = null;
      state.medical_license_number = null;
      state.qualifications = null;
      state.years_of_experience = null;
      state.npi_number = null;
      state.dea_number = null;
      state.available_for_telehealth = null;
      state.biography = null;
      state.languages_spoken = null;
      state.is_google_connected = null;
      state.role = null;
    },
    updateUserPictureUrl: (state, action: PayloadAction<string>) => {
      if (state) {
        state.profile_picture_url = action.payload;
      }
    },
    setProfilePicture: (state, action: PayloadAction<string>) => {
      state.profile_picture_url = action.payload;
    },
  },
  extraReducers: (builder) => {
    let toastingId: string;

    builder.addCase(
      fetchHospitalInfo.fulfilled,
      (state, action: PayloadAction<Hospital>) => {
        if (!state.hospital) {
          toast.success("Hospital loaded successfully");
        }
        if (toastingId) {
          toast.dismiss(toastingId);
          toastingId = "";
        }
        state.hospital = action.payload;
      }
    );

    builder.addCase(
      fetchStaffInfo.fulfilled,
      (state, action: PayloadAction<StaffProfile>) => {
        state.name = action.payload.first_name + " " + action.payload.last_name;
        state.email = action.payload.email;
        state.hospital_id = action.payload.hospital_id;
        state.profile_picture_url = action.payload.profile_picture_url;
        state.id = action.payload.user_id;
        state.job_title = action.payload.job_title;
      }
    );

    builder.addCase(
      fetchDoctorInfo.fulfilled,
      (state, action: PayloadAction<DoctorProfile>) => {
        state.id = action.payload.user_id;
        state.email = action.payload.email;
        state.name = action.payload.first_name + " " + action.payload.last_name;
        state.profile_picture_url = action.payload.profile_picture_url;
        state.specialization = action.payload.specialization;
        state.department_name = action.payload.department_name;
        state.medical_license_number = action.payload.medical_license_number;
        state.qualifications = action.payload.qualifications;
        state.years_of_experience = action.payload.years_of_experience;
        state.npi_number = action.payload.npi_number;
        state.dea_number = action.payload.dea_number;
        state.available_for_telehealth = action.payload.available_for_telehealth;
        state.biography = action.payload.biography;
        state.languages_spoken = action.payload.languages_spoken;
        state.is_google_connected = action.payload.is_google_connected;
      }
    );

    builder.addCase(
      fetchUserInfo.fulfilled,
      (state, action: PayloadAction<any>) => {
        state.id = action.payload.id;
        state.email = action.payload.email;
        state.first_name = action.payload.first_name;
        state.last_name = action.payload.last_name;
        state.name = action.payload.first_name + " " + action.payload.last_name;
        state.role = action.payload.role?.name || action.payload.role || null;
      }
    );
  },
});

// Export actions and reducer
export const { login, Logout, updateUserPictureUrl } = authSlice.actions;
export default authSlice.reducer;
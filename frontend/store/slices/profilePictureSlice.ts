// src/store/slices/profilePictureSlice.ts

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { updateUserPictureUrl } from "./authSlice"; // We'll create this in the next step

// --- 1. Define the Async Thunk for the upload ---
export const uploadProfilePicture = createAsyncThunk(
  "profilePicture/upload",
  async (
    { file, adminType }: { file: File; adminType: string },
    { dispatch, rejectWithValue } // Get dispatch from thunkAPI
  ) => {
    const endpoint =
      adminType === "Doctor"
        ? "/doctors/me/profile-picture"
        : "/staff/me/profile-picture";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await privateApi.put<{ profile_picture_url: string }>(
        endpoint,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      
      const newUrl = response.data.profile_picture_url;

      // --- On success, dispatch an action to the authSlice to update the user's data ---
      dispatch(updateUserPictureUrl(newUrl));

      return newUrl; // Return the URL for the fulfilled action payload
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Failed to upload image.";
      return rejectWithValue(errorMessage);
    }
  }
);

// --- 2. Define the State and Slice ---
interface ProfilePictureState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: ProfilePictureState = {
  status: "idle",
  error: null,
};

const profilePictureSlice = createSlice({
  name: "profilePicture",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(uploadProfilePicture.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(uploadProfilePicture.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default profilePictureSlice.reducer;
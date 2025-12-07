// src/store/slices/doctorSidebarSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DoctorSidebarState {
  isDoctorSidebarOpen: boolean;
}

const initialState: DoctorSidebarState = {
  isDoctorSidebarOpen: false,
};

const doctorSidebarSlice = createSlice({
  name: "doctorSidebar",
  initialState,
  reducers: {
    // This reducer now accepts a boolean payload to set the state directly
    setDoctorSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isDoctorSidebarOpen = action.payload;
    },
    // You can still keep the toggle if you need it elsewhere
    toggleDoctorSidebar: (state) => {
      state.isDoctorSidebarOpen = !state.isDoctorSidebarOpen;
    }
  },
});

export const { setDoctorSidebarOpen, toggleDoctorSidebar } = doctorSidebarSlice.actions;

export default doctorSidebarSlice.reducer;
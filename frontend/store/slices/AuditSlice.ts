import { DataAuditLogs, Log } from "@/hooks/types/types";
import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

// State interface
interface AuditState {
  allLogs: Log[];
  loading: boolean;
  error: string | null;
}

const initialState: AuditState = {
  allLogs: [],
  loading: false,
  error: null,
};

// CHANGED: Thunk now expects a simple array and has no page parameter
export const fetchAllLogs = createAsyncThunk(
  "logs/fetchAllLogs",
  async (_, ThunkApi) => {
    try {
      // The API now returns an array of logs directly
      const res = await privateApi.get<Log[]>(`/audit-logs/`);

      // The response is already in the correct format, so we can return it directly.
      // If field names were different, you would map them here.
      // e.g., res.data.map(log => ({ time: log.timestamp, ... }))
      return res.data;
    } catch (err: any) {
      return ThunkApi.rejectWithValue(
        err.response?.data?.detail || "Failed to fetch logs"
      );
    }
  }
);

const auditSlice = createSlice({
  name: "allLogs",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.allLogs = action.payload; // CHANGED: Directly set the logs array
        toast.success("Logs loaded successfully");
      })
      .addCase(fetchAllLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch logs";
      });
  },
});

export const { clearError } = auditSlice.actions;
export default auditSlice.reducer;
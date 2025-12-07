import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getMyInvoices,
  getMyInvoiceDetails,
  downloadMyInvoice,
  getHospitalInvoices,
  getHospitalInvoiceDetails,
  downloadHospitalInvoice,
  generateInvoice,
  getInvoiceByAppointment,
  Invoice,
  GenerateInvoiceRequest
} from "@/app/_apis/invoices";

interface InvoiceState {
  // Patient invoices
  patientInvoices: Invoice[];
  patientInvoicesLoading: boolean;
  patientInvoicesError: string | null;
  
  // Hospital invoices
  hospitalInvoices: Invoice[];
  hospitalInvoicesLoading: boolean;
  hospitalInvoicesError: string | null;
  
  // Selected invoice details
  selectedInvoice: Invoice | null;
  selectedInvoiceLoading: boolean;
  selectedInvoiceError: string | null;
  
  // Generate invoice
  generating: boolean;
  generateError: string | null;
  
  // Download states
  downloading: number | null;
  downloadError: string | null;
}

const initialState: InvoiceState = {
  patientInvoices: [],
  patientInvoicesLoading: false,
  patientInvoicesError: null,
  
  hospitalInvoices: [],
  hospitalInvoicesLoading: false,
  hospitalInvoicesError: null,
  
  selectedInvoice: null,
  selectedInvoiceLoading: false,
  selectedInvoiceError: null,
  
  generating: false,
  generateError: null,
  
  downloading: null,
  downloadError: null,
};

// Async thunks for patient
export const fetchPatientInvoices = createAsyncThunk(
  "invoices/fetchPatientInvoices",
  async ({ skip = 0, limit = 100 }: { skip?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const data = await getMyInvoices(skip, limit);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch patient invoices");
    }
  }
);

export const fetchPatientInvoiceDetails = createAsyncThunk(
  "invoices/fetchPatientInvoiceDetails",
  async (invoiceId: number, { rejectWithValue }) => {
    try {
      const data = await getMyInvoiceDetails(invoiceId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch invoice details");
    }
  }
);

export const downloadPatientInvoice = createAsyncThunk(
  "invoices/downloadPatientInvoice",
  async (invoiceId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadMyInvoice(invoiceId);
      return { blob, invoiceId };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download invoice");
    }
  }
);

// Async thunks for hospital
export const fetchHospitalInvoicesThunk = createAsyncThunk(
  "invoices/fetchHospitalInvoices",
  async ({ skip = 0, limit = 100 }: { skip?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const data = await getHospitalInvoices(skip, limit);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch hospital invoices");
    }
  }
);

export const fetchHospitalInvoiceDetails = createAsyncThunk(
  "invoices/fetchHospitalInvoiceDetails",
  async (invoiceId: number, { rejectWithValue }) => {
    try {
      const data = await getHospitalInvoiceDetails(invoiceId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch invoice details");
    }
  }
);

export const downloadHospitalInvoiceThunk = createAsyncThunk(
  "invoices/downloadHospitalInvoice",
  async (invoiceId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadHospitalInvoice(invoiceId);
      return { blob, invoiceId };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download invoice");
    }
  }
);

export const generateInvoiceThunk = createAsyncThunk(
  "invoices/generateInvoice",
  async (data: GenerateInvoiceRequest, { rejectWithValue }) => {
    try {
      const invoice = await generateInvoice(data);
      return invoice;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to generate invoice");
    }
  }
);

export const fetchInvoiceByAppointment = createAsyncThunk(
  "invoices/fetchInvoiceByAppointment",
  async (appointmentId: number, { rejectWithValue }) => {
    try {
      const data = await getInvoiceByAppointment(appointmentId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch invoice for appointment");
    }
  }
);

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
      state.selectedInvoiceError = null;
    },
    clearErrors: (state) => {
      state.patientInvoicesError = null;
      state.hospitalInvoicesError = null;
      state.selectedInvoiceError = null;
      state.generateError = null;
      state.downloadError = null;
    },
    setDownloading: (state, action: PayloadAction<number | null>) => {
      state.downloading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch patient invoices
    builder
      .addCase(fetchPatientInvoices.pending, (state) => {
        state.patientInvoicesLoading = true;
        state.patientInvoicesError = null;
      })
      .addCase(fetchPatientInvoices.fulfilled, (state, action) => {
        state.patientInvoicesLoading = false;
        state.patientInvoices = action.payload;
      })
      .addCase(fetchPatientInvoices.rejected, (state, action) => {
        state.patientInvoicesLoading = false;
        state.patientInvoicesError = action.payload as string;
      });

    // Fetch patient invoice details
    builder
      .addCase(fetchPatientInvoiceDetails.pending, (state) => {
        state.selectedInvoiceLoading = true;
        state.selectedInvoiceError = null;
      })
      .addCase(fetchPatientInvoiceDetails.fulfilled, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchPatientInvoiceDetails.rejected, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoiceError = action.payload as string;
      });

    // Download patient invoice
    builder
      .addCase(downloadPatientInvoice.pending, (state, action) => {
        state.downloading = action.meta.arg;
        state.downloadError = null;
      })
      .addCase(downloadPatientInvoice.fulfilled, (state) => {
        state.downloading = null;
      })
      .addCase(downloadPatientInvoice.rejected, (state, action) => {
        state.downloading = null;
        state.downloadError = action.payload as string;
      });

    // Fetch hospital invoices
    builder
      .addCase(fetchHospitalInvoicesThunk.pending, (state) => {
        state.hospitalInvoicesLoading = true;
        state.hospitalInvoicesError = null;
      })
      .addCase(fetchHospitalInvoicesThunk.fulfilled, (state, action) => {
        state.hospitalInvoicesLoading = false;
        state.hospitalInvoices = action.payload;
      })
      .addCase(fetchHospitalInvoicesThunk.rejected, (state, action) => {
        state.hospitalInvoicesLoading = false;
        state.hospitalInvoicesError = action.payload as string;
      });

    // Fetch hospital invoice details
    builder
      .addCase(fetchHospitalInvoiceDetails.pending, (state) => {
        state.selectedInvoiceLoading = true;
        state.selectedInvoiceError = null;
      })
      .addCase(fetchHospitalInvoiceDetails.fulfilled, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchHospitalInvoiceDetails.rejected, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoiceError = action.payload as string;
      });

    // Download hospital invoice
    builder
      .addCase(downloadHospitalInvoiceThunk.pending, (state, action) => {
        state.downloading = action.meta.arg;
        state.downloadError = null;
      })
      .addCase(downloadHospitalInvoiceThunk.fulfilled, (state) => {
        state.downloading = null;
      })
      .addCase(downloadHospitalInvoiceThunk.rejected, (state, action) => {
        state.downloading = null;
        state.downloadError = action.payload as string;
      });

    // Generate invoice
    builder
      .addCase(generateInvoiceThunk.pending, (state) => {
        state.generating = true;
        state.generateError = null;
      })
      .addCase(generateInvoiceThunk.fulfilled, (state, action) => {
        state.generating = false;
        // Add the new invoice to the hospital invoices list
        state.hospitalInvoices.unshift(action.payload);
      })
      .addCase(generateInvoiceThunk.rejected, (state, action) => {
        state.generating = false;
        state.generateError = action.payload as string;
      });

    // Fetch invoice by appointment
    builder
      .addCase(fetchInvoiceByAppointment.pending, (state) => {
        state.selectedInvoiceLoading = true;
        state.selectedInvoiceError = null;
      })
      .addCase(fetchInvoiceByAppointment.fulfilled, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceByAppointment.rejected, (state, action) => {
        state.selectedInvoiceLoading = false;
        state.selectedInvoiceError = action.payload as string;
      });
  },
});

export const { clearSelectedInvoice, clearErrors, setDownloading } = invoiceSlice.actions;
export default invoiceSlice.reducer;

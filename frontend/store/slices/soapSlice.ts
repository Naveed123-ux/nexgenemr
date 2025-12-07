import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import toast from "react-hot-toast";

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface GenerateSoapFromTextResponse {
  transcript: string;
  soap_note: SoapNote;
  soap_note_id: number;
}

interface GenerateSoapFromTextPayload {
  transcript: string;
  appointment_id: number;
}

interface GenerateSoapFromAudioPayload {
  file: File | Blob;
  appointment_id: number;
}

interface SoapState {
  generatedSoapNote: GenerateSoapFromTextResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: SoapState = {
  generatedSoapNote: null,
  loading: false,
  error: null,
};

export const generateSoapNoteFromText = createAsyncThunk(
  "soap/generateFromText",
  async (payload: GenerateSoapFromTextPayload, { rejectWithValue }) => {
    try {
      const response = await privateApi.post<GenerateSoapFromTextResponse>(
        "/soap-notes/generate-from-text",
        payload
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to generate SOAP note"
      );
    }
  }
);

export const generateSoapNoteFromAudio = createAsyncThunk(
  "soap/generateFromAudio",
  async (payload: GenerateSoapFromAudioPayload, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", payload.file, "audio.mp3");
      formData.append("appointment_id", payload.appointment_id.toString());

      const response = await privateApi.post<GenerateSoapFromTextResponse>(
        "/soap-notes/generate-from-audio",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail ||
          "Failed to generate SOAP note from audio"
      );
    }
  }
);

const soapSlice = createSlice({
  name: "soap",
  initialState,
  reducers: {
    resetSoapNote: (state) => {
      state.generatedSoapNote = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate from text
      .addCase(generateSoapNoteFromText.pending, (state) => {
        state.loading = true;
        state.error = null;
        toast.loading("Generating SOAP note from text...");
      })
      .addCase(
        generateSoapNoteFromText.fulfilled,
        (state, action: PayloadAction<GenerateSoapFromTextResponse>) => {
          state.loading = false;
          state.generatedSoapNote = action.payload;
          toast.dismiss();
          toast.success("SOAP note generated successfully!");
        }
      )
      .addCase(generateSoapNoteFromText.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.dismiss();
        toast.error(action.payload as string);
      })
      // Generate from audio
      .addCase(generateSoapNoteFromAudio.pending, (state) => {
        state.loading = true;
        state.error = null;
        toast.loading("Processing audio and generating SOAP note...");
      })
      .addCase(
        generateSoapNoteFromAudio.fulfilled,
        (state, action: PayloadAction<GenerateSoapFromTextResponse>) => {
          state.loading = false;
          state.generatedSoapNote = action.payload;
          toast.dismiss();
          toast.success("SOAP note generated from audio successfully!");
        }
      )
      .addCase(generateSoapNoteFromAudio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.dismiss();
        toast.error(action.payload as string);
      });
  },
});

export const { resetSoapNote } = soapSlice.actions;

export default soapSlice.reducer;

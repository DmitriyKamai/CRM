import { createSlice } from "@reduxjs/toolkit";

export type DiagnosticsVariant = "male" | "female" | "adolescent";

export type SyncStatus = "idle" | "saving" | "error";

interface DiagnosticsProgressState {
  currentToken: string | null;
  variant: DiagnosticsVariant | null;
  currentStep: number;
  syncStatus: SyncStatus;
  syncError: string | null;
  submittedAt: string | null;
}

const initialState: DiagnosticsProgressState = {
  currentToken: null,
  variant: null,
  currentStep: 0,
  syncStatus: "idle",
  syncError: null,
  submittedAt: null
};

export const diagnosticsProgressSlice = createSlice({
  name: "diagnosticsProgress",
  initialState,
  reducers: {
    initSession: (
      state,
      action: {
        payload: {
          token: string;
          variant: DiagnosticsVariant | null;
          currentStep: number;
        };
      }
    ) => {
      state.currentToken = action.payload.token;
      state.variant = action.payload.variant;
      state.currentStep = action.payload.currentStep;
      state.syncStatus = "idle";
      state.syncError = null;
      state.submittedAt = null;
    },
    setVariant: (state, action: { payload: DiagnosticsVariant }) => {
      state.variant = action.payload;
    },
    setStep: (state, action: { payload: number }) => {
      state.currentStep = action.payload;
    },
    setSyncStatus: (state, action: { payload: SyncStatus }) => {
      state.syncStatus = action.payload;
      if (action.payload !== "error") state.syncError = null;
    },
    setSyncError: (state, action: { payload: string }) => {
      state.syncStatus = "error";
      state.syncError = action.payload;
    },
    markSubmitted: state => {
      state.submittedAt = new Date().toISOString();
      state.syncStatus = "idle";
      state.syncError = null;
    },
    resetSession: () => initialState
  }
});

export const {
  initSession,
  setVariant,
  setStep,
  setSyncStatus,
  setSyncError,
  markSubmitted,
  resetSession
} = diagnosticsProgressSlice.actions;

export default diagnosticsProgressSlice.reducer;

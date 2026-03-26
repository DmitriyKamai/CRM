import { createSlice } from "@reduxjs/toolkit";

export type AnalyticsPeriod = "week" | "month" | "quarter" | "year" | "custom";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  dateFrom: string | null;
  dateTo: string | null;
  psychologistId: string | null;
  testType: string | null;
};

export type SavedView = {
  id: string;
  label: string;
  filters: AnalyticsFilters;
};

interface AnalyticsState {
  filters: AnalyticsFilters;
  savedViews: SavedView[];
  activeViewId: string | null;
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  period: "month",
  dateFrom: null,
  dateTo: null,
  psychologistId: null,
  testType: null
};

const initialState: AnalyticsState = {
  filters: DEFAULT_FILTERS,
  savedViews: [],
  activeViewId: null
};

export const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    setFilter: (
      state,
      action: { payload: Partial<AnalyticsFilters> }
    ) => {
      state.filters = { ...state.filters, ...action.payload };
      state.activeViewId = null;
    },
    resetFilters: state => {
      state.filters = DEFAULT_FILTERS;
      state.activeViewId = null;
    },
    applyView: (state, action: { payload: string }) => {
      const view = state.savedViews.find(v => v.id === action.payload);
      if (!view) return;
      state.filters = { ...view.filters };
      state.activeViewId = view.id;
    },
    saveCurrentView: (state, action: { payload: { id: string; label: string } }) => {
      const existing = state.savedViews.findIndex(v => v.id === action.payload.id);
      const entry: SavedView = {
        id: action.payload.id,
        label: action.payload.label,
        filters: { ...state.filters }
      };
      if (existing >= 0) {
        state.savedViews[existing] = entry;
      } else {
        state.savedViews.push(entry);
      }
      state.activeViewId = action.payload.id;
    },
    removeView: (state, action: { payload: string }) => {
      state.savedViews = state.savedViews.filter(v => v.id !== action.payload);
      if (state.activeViewId === action.payload) state.activeViewId = null;
    }
  }
});

export const { setFilter, resetFilters, applyView, saveCurrentView, removeView } =
  analyticsSlice.actions;

export default analyticsSlice.reducer;

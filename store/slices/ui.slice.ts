import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  mobileMenuOpen: boolean;
}

const initialState: UiState = {
  mobileMenuOpen: false
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openMobileMenu: state => {
      state.mobileMenuOpen = true;
    },
    closeMobileMenu: state => {
      state.mobileMenuOpen = false;
    },
    toggleMobileMenu: state => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    }
  }
});

export const { openMobileMenu, closeMobileMenu, toggleMobileMenu } = uiSlice.actions;
export default uiSlice.reducer;

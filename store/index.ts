import { configureStore } from "@reduxjs/toolkit";

import uiReducer from "./slices/ui.slice";
import notificationsReducer from "./slices/notifications.slice";
import analyticsReducer from "./slices/analytics.slice";
import diagnosticsProgressReducer from "./slices/diagnostics-progress.slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      ui: uiReducer,
      notifications: notificationsReducer,
      analytics: analyticsReducer,
      diagnosticsProgress: diagnosticsProgressReducer
    }
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

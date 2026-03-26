import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

interface NotificationsState {
  items: NotificationItem[];
  fetchStatus: "idle" | "loading" | "error";
  panelOpen: boolean;
}

const initialState: NotificationsState = {
  items: [],
  fetchStatus: "idle",
  panelOpen: false
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return [] as NotificationItem[];
    const data = await res.json();
    return (Array.isArray(data) ? data : []) as NotificationItem[];
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true })
    });
    return id;
  }
);

export const removeNotification = createAsyncThunk(
  "notifications/remove",
  async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Не удалось удалить уведомление");
    return id;
  }
);

export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAll",
  async (ids: string[]) => {
    await Promise.all(
      ids.map(id =>
        fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {})
      )
    );
    return ids;
  }
);

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setPanelOpen: (state, action: { payload: boolean }) => {
      state.panelOpen = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchNotifications.pending, state => {
        state.fetchStatus = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.fetchStatus = "idle";
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, state => {
        state.fetchStatus = "error";
        state.items = [];
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find(n => n.id === action.payload);
        if (item) item.read = true;
      })
      .addCase(removeNotification.fulfilled, (state, action) => {
        state.items = state.items.filter(n => n.id !== action.payload);
      })
      .addCase(clearAllNotifications.fulfilled, state => {
        state.items = [];
      });
  }
});

export const { setPanelOpen } = notificationsSlice.actions;

export const selectUnreadCount = (state: { notifications: NotificationsState }) =>
  state.notifications.items.filter(n => !n.read).length;

export default notificationsSlice.reducer;

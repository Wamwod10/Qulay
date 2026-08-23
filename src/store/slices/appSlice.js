import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    globalLoading: false,
    globalLoadingMessage: "Platforma yuklanmoqda...",
};

const appSlice = createSlice({
    name: "app",

    initialState,

    reducers: {
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },

        setSidebarCollapsed: (state, action) => {
            state.sidebarCollapsed = action.payload;
        },

        setMobileSidebarOpen: (state, action) => {
            state.mobileSidebarOpen = action.payload;
        },

        setGlobalLoading: (state, action) => {
            if (typeof action.payload === "object") {
                state.globalLoading = Boolean(action.payload.loading);
                state.globalLoadingMessage = action.payload.message || initialState.globalLoadingMessage;
                return;
            }

            state.globalLoading = action.payload;
            if (!action.payload) {
                state.globalLoadingMessage = initialState.globalLoadingMessage;
            }
        },

        setGlobalLoadingMessage: (state, action) => {
            state.globalLoadingMessage = action.payload || initialState.globalLoadingMessage;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarCollapsed,
    setMobileSidebarOpen,
    setGlobalLoading,
    setGlobalLoadingMessage,
} = appSlice.actions;

export default appSlice.reducer;

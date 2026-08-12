import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    sidebarCollapsed: false,
    mobileSidebarOpen: false,
    globalLoading: false,
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
            state.globalLoading = action.payload;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarCollapsed,
    setMobileSidebarOpen,
    setGlobalLoading,
} = appSlice.actions;

export default appSlice.reducer;
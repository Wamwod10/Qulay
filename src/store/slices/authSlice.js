import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: {
        id: "dev-user",
        name: "Administrator",
        email: "admin@example.com",
    },

    accessToken: null,
    isAuthenticated: true,
    isInitialized: true,
};

const authSlice = createSlice({
    name: "auth",

    initialState,

    reducers: {
        setAuth: (state, action) => {
            state.user = action.payload.user ?? null;
            state.accessToken = action.payload.accessToken ?? null;
            state.isAuthenticated = Boolean(action.payload.user);
            state.isInitialized = true;
        },

        setCurrentUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = Boolean(action.payload);
        },

        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.isInitialized = true;
        },

        setAuthInitialized: (state, action) => {
            state.isInitialized = action.payload;
        },
    },
});

export const {
    setAuth,
    setCurrentUser,
    logout,
    setAuthInitialized,
} = authSlice.actions;

export default authSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,
    account: null,
    session: null,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: false,
};

const authSlice = createSlice({
    name: "auth",

    initialState,

    reducers: {
        setAuth: (state, action) => {
            state.user = action.payload.user ?? null;
            state.account = action.payload.account ?? null;
            state.session = action.payload.session ?? null;
            state.accessToken = action.payload.accessToken ?? null;
            state.isAuthenticated = Boolean(action.payload.user);
            state.isInitialized = true;
        },

        setCurrentUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = Boolean(action.payload);
        },

        setCurrentAccount: (state, action) => {
            state.account = action.payload;
        },

        logout: (state) => {
            state.user = null;
            state.account = null;
            state.session = null;
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
    setCurrentAccount,
    logout,
    setAuthInitialized,
} = authSlice.actions;

export default authSlice.reducer;

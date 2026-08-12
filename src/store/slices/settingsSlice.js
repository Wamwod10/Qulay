import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    locale: "uz",
    currency: "UZS",
    timezone: "Asia/Tashkent",
    dateFormat: "DD.MM.YYYY",
};

const settingsSlice = createSlice({
    name: "settings",

    initialState,

    reducers: {
        setLocale: (state, action) => {
            state.locale = action.payload;
        },

        setCurrency: (state, action) => {
            state.currency = action.payload;
        },

        setTimezone: (state, action) => {
            state.timezone = action.payload;
        },

        setDateFormat: (state, action) => {
            state.dateFormat = action.payload;
        },
    },
});

export const {
    setLocale,
    setCurrency,
    setTimezone,
    setDateFormat,
} = settingsSlice.actions;

export default settingsSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    enabledModules: [],

    isInitialized: false,
};

const modulesSlice = createSlice({
    name: "modules",

    initialState,

    reducers: {
        setEnabledModules: (state, action) => {
            state.enabledModules = action.payload;
            state.isInitialized = true;
        },

        enableModule: (state, action) => {
            const moduleKey = action.payload;

            if (!state.enabledModules.includes(moduleKey)) {
                state.enabledModules.push(moduleKey);
            }
        },

        disableModule: (state, action) => {
            state.enabledModules = state.enabledModules.filter(
                (moduleKey) => moduleKey !== action.payload,
            );
        },

        clearModules: (state) => {
            state.enabledModules = [];
            state.isInitialized = false;
        },
    },
});

export const {
    setEnabledModules,
    enableModule,
    disableModule,
    clearModules,
} = modulesSlice.actions;

export default modulesSlice.reducer;

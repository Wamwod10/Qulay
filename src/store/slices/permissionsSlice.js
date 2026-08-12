import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    permissions: [
        "dashboard.view",

        "sales.view",

        "manufacturing.view",
        "manufacturing.order.view",
        "manufacturing.order.create",

        "warehouse.view",

        "purchases.view",

        "products.view",
        "products.create",
        "products.update",

        "customers.view",

        "agents.view",

        "suppliers.view",

        "finance.view",

        "employees.view",

        "reports.view",

        "settings.view",
    ],

    roles: [
        "administrator",
    ],

    isInitialized: true,
};

const permissionsSlice = createSlice({
    name: "permissions",

    initialState,

    reducers: {
        setPermissions: (state, action) => {
            state.permissions = action.payload;
            state.isInitialized = true;
        },

        setRoles: (state, action) => {
            state.roles = action.payload;
        },

        clearPermissions: (state) => {
            state.permissions = [];
            state.roles = [];
            state.isInitialized = false;
        },
    },
});

export const {
    setPermissions,
    setRoles,
    clearPermissions,
} = permissionsSlice.actions;

export default permissionsSlice.reducer;
